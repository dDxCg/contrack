import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CHANNEL_CLIENT, ChannelClient } from '../../data/channel-client/channel-client';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import {
  ContractItemView,
  ContractSiteView,
  ContractView,
  ContractPage,
} from '../../dtos/contracts/contracts.response.dto';
import { toContractItemView, toContractView } from '../../dtos/contracts/contracts.mapper';
import { pageOf } from '../../dtos/page.dto';
import {
  AuthOutOfScopeException,
  FieldViolation,
  ValidationFailedException,
} from '../../models/domain-errors';
import { AlertKind } from '../../models/alerts/alert.entity';
import { Contract, ContractStatus } from '../../models/contracts/contract.entity';
import { ContractItem, FrequencyUnit } from '../../models/contracts/contract-item.entity';
import { ContractSite } from '../../models/contracts/contract-site.entity';
import { Shift, ShiftStatus } from '../../models/shifts/shift.entity';
import { AlertRepository, IAlertRepository } from '../../repositories/alerts/alert.repository';
import {
  ContractItemRepository,
  IContractItemRepository,
} from '../../repositories/contracts/contract-item.repository';
import { ContractRepository, IContractRepository } from '../../repositories/contracts/contract.repository';
import {
  ContractSiteRepository,
  IContractSiteRepository,
} from '../../repositories/contracts/contract-site.repository';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { ITeamRepository, TeamRepository } from '../../repositories/teams/team.repository';
import { Page } from '../../repositories/tenant-scoped.repository';
import { AccessContext } from '../access-control/access-context';
import { fireAlert } from '../alerts/alert-firer';
import { daysSinceEpoch, toDateString } from '../../utils/period';
import { AssembledContract, ContractAssembler } from './contract-assembler';
import { RebalanceCandidate, ScheduleRebalancer } from './schedule-rebalancer';
const REBALANCE_WINDOW_DAYS = 7;
export interface ContractItemCommand {
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: number;
}
export interface ContractSiteCommand {
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  items: ContractItemCommand[];
}
export interface ContractCreateCommand {
  customerId: number;
  signedAt: Date;
  expiresAt: Date;
  sites: ContractSiteCommand[];
}
export interface ContractUpdateCommand {
  expiresAt?: Date;
  status?: ContractStatus;
}
export interface ContractSiteUpdateCommand {
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}
@Injectable()
export class ContractService {
  constructor(
    @Inject(ContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(ContractSiteRepository)
    private readonly contractSiteRepository: IContractSiteRepository,
    @Inject(ContractItemRepository)
    private readonly contractItemRepository: IContractItemRepository,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(TeamRepository)
    private readonly teamRepository: ITeamRepository,
    @Inject(AlertRepository)
    private readonly alertRepository: IAlertRepository,
    @Inject(CHANNEL_CLIENT)
    private readonly channelClient: ChannelClient,
    private readonly contractAssembler: ContractAssembler,
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}
  async list(access: AccessContext, page: Page): Promise<ContractPage> {
    const { items, total } = await this.contractRepository.list(access.tenantId, page);
    return pageOf(
      items.map((contract) => toContractView(contract, [])),
      total,
      page,
    );
  }
  async get(access: AccessContext, id: number): Promise<ContractView> {
    return toContractView(await this.requireContract(access, id), []);
  }
  async create(access: AccessContext, command: ContractCreateCommand): Promise<ContractView> {
    const violations = validate(command);
    if (violations.length > 0) {
      throw new ValidationFailedException(violations);
    }
    const assembled = this.contractAssembler.assemble(access, command);
    const { view, overloadedDates } = await this.dataSource.transaction((tx) =>
      this.persist(access, assembled, tx),
    );
    for (const date of overloadedDates) {
      await fireAlert(
        { alertRepository: this.alertRepository, channelClient: this.channelClient },
        access.tenantId,
        AlertKind.ScheduleOverload,
        daysSinceEpoch(date),
      );
    }
    return view;
  }
  private async persist(
    access: AccessContext,
    assembled: AssembledContract,
    tx: EntityManager,
  ): Promise<{ view: ContractView; overloadedDates: Date[] }> {
    const savedContract = await this.contractRepository.create(assembled.entity, tx);
    const siteViews: ContractSiteView[] = [];
    const placements: { savedItem: ContractItem; date: Date }[] = [];
    const candidates: RebalanceCandidate[] = [];
    for (const site of assembled.sites) {
      site.entity.contractId = savedContract.id;
      const savedSite = await this.contractSiteRepository.create(site.entity, tx);
      const itemViews: ContractItemView[] = [];
      for (const item of site.items) {
        item.entity.siteId = savedSite.id;
        const savedItem = await this.contractItemRepository.create(item.entity, tx);
        itemViews.push(toContractItemView(savedItem));
        const constrained = savedItem.dayOfWeek != null || savedItem.dayOfMonth != null;
        for (const date of item.scheduledDates) {
          placements.push({ savedItem, date });
          candidates.push({ date, constrained });
        }
      }
      siteViews.push({
        id: savedSite.id,
        name: savedSite.name,
        work_requirements: savedSite.workRequirements,
        notes: savedSite.notes,
        latitude: savedSite.latitude,
        longitude: savedSite.longitude,
        radius_meters: savedSite.radiusMeters,
        items: itemViews,
      });
    }
    const teamCapacity = await this.teamRepository.count(access.tenantId, tx);
    const rebalancer = new ScheduleRebalancer(
      (date) => this.shiftRepository.countForTenantOnDate(access.tenantId, toDateString(date), tx),
      teamCapacity,
      REBALANCE_WINDOW_DAYS,
    );
    const resolved = await rebalancer.resolve(candidates, {
      from: savedContract.signedAt,
      to: savedContract.expiresAt,
    });
    const generatedShifts: Shift[] = [];
    const datesTouched = new Map<string, Date>();
    resolved.forEach((result, index) => {
      const { savedItem } = placements[index];
      generatedShifts.push(aScheduledShift(access, savedItem, result.date));
      datesTouched.set(toDateString(result.date), result.date);
    });
    await this.shiftRepository.createMany(generatedShifts, tx);
    const overloadedDates: Date[] = [];
    for (const [dateString, date] of datesTouched) {
      const count = await this.shiftRepository.countForTenantOnDate(access.tenantId, dateString, tx);
      if (count > teamCapacity) {
        overloadedDates.push(date);
      }
    }
    return { view: toContractView(savedContract, siteViews), overloadedDates };
  }
  async update(access: AccessContext, id: number, command: ContractUpdateCommand): Promise<ContractView> {
    const contract = await this.requireContract(access, id);
    if (command.expiresAt !== undefined) {
      contract.setTerm(contract.signedAt, command.expiresAt);
    }
    if (command.status !== undefined) {
      contract.setStatus(command.status);
    }
    const saved = await this.contractRepository.update(contract);
    return toContractView(saved, []);
  }
  async delete(access: AccessContext, id: number): Promise<void> {
    await this.requireContract(access, id);
    await this.contractRepository.delete(access.tenantId, id);
  }
  async addSite(
    access: AccessContext,
    contractId: number,
    command: ContractSiteCommand,
  ): Promise<ContractSiteView> {
    const contract = await this.requireContract(access, contractId);
    const violations = validateSiteItems(command.items);
    if (violations.length > 0) {
      throw new ValidationFailedException(violations);
    }
    const site = new ContractSite();
    site.tenantId = access.tenantId;
    site.contractId = contract.id;
    site.setName(command.name);
    site.setWorkRequirements(command.workRequirements);
    site.setNotes(command.notes);
    site.setLocation(command.latitude, command.longitude, command.radiusMeters);
    const savedSite = await this.contractSiteRepository.create(site);
    const itemViews: ContractItemView[] = [];
    for (const itemCommand of command.items) {
      const item = buildContractItem(access.tenantId, savedSite.id, itemCommand);
      const savedItem = await this.contractItemRepository.create(item);
      itemViews.push(toContractItemView(savedItem));
    }
    return toContractSiteView(savedSite, itemViews);
  }
  async updateSite(
    access: AccessContext,
    siteId: number,
    command: ContractSiteUpdateCommand,
  ): Promise<ContractSiteView> {
    const site = await this.requireSite(access, siteId);
    site.setName(command.name);
    site.setWorkRequirements(command.workRequirements);
    site.setNotes(command.notes);
    site.setLocation(command.latitude, command.longitude, command.radiusMeters);
    const saved = await this.contractSiteRepository.update(site);
    const items = await this.contractItemRepository.listBySite(access.tenantId, saved.id);
    return toContractSiteView(saved, items.map(toContractItemView));
  }
  async deleteSite(access: AccessContext, siteId: number): Promise<void> {
    await this.requireSite(access, siteId);
    await this.contractSiteRepository.delete(access.tenantId, siteId);
  }
  async addItem(
    access: AccessContext,
    siteId: number,
    command: ContractItemCommand,
  ): Promise<ContractItemView> {
    const site = await this.requireSite(access, siteId);
    const item = buildContractItem(access.tenantId, site.id, command);
    const violations = item.assertValid();
    if (violations.length > 0) {
      throw new ValidationFailedException(violations);
    }
    const saved = await this.contractItemRepository.create(item);
    return toContractItemView(saved);
  }
  async updateItem(
    access: AccessContext,
    itemId: number,
    command: ContractItemCommand,
  ): Promise<ContractItemView> {
    const item = await this.requireItem(access, itemId);
    item.setName(command.name);
    item.setFrequency(
      command.frequencyCount,
      command.frequencyUnit,
      command.frequencyRule,
      command.dayOfWeek,
      command.dayOfMonth,
    );
    item.setUnitPrice(command.unitPrice);
    const violations = item.assertValid();
    if (violations.length > 0) {
      throw new ValidationFailedException(violations);
    }
    const saved = await this.contractItemRepository.update(item);
    return toContractItemView(saved);
  }
  async deleteItem(access: AccessContext, itemId: number): Promise<void> {
    await this.requireItem(access, itemId);
    await this.contractItemRepository.delete(access.tenantId, itemId);
  }
  private async requireContract(access: AccessContext, id: number): Promise<Contract> {
    const contract = await this.contractRepository.findById(access.tenantId, id);
    if (contract === null) {
      throw new AuthOutOfScopeException();
    }
    return contract;
  }
  private async requireSite(access: AccessContext, id: number): Promise<ContractSite> {
    const site = await this.contractSiteRepository.findById(access.tenantId, id);
    if (site === null) {
      throw new AuthOutOfScopeException();
    }
    return site;
  }
  private async requireItem(access: AccessContext, id: number): Promise<ContractItem> {
    const item = await this.contractItemRepository.findById(access.tenantId, id);
    if (item === null) {
      throw new AuthOutOfScopeException();
    }
    return item;
  }
}
function buildContractItem(tenantId: number, siteId: number, command: ContractItemCommand): ContractItem {
  const item = new ContractItem();
  item.tenantId = tenantId;
  item.siteId = siteId;
  item.setName(command.name);
  item.setFrequency(
    command.frequencyCount,
    command.frequencyUnit,
    command.frequencyRule,
    command.dayOfWeek,
    command.dayOfMonth,
  );
  item.setUnitPrice(command.unitPrice);
  return item;
}
function toContractSiteView(site: ContractSite, items: ContractItemView[]): ContractSiteView {
  return {
    id: site.id,
    name: site.name,
    work_requirements: site.workRequirements,
    notes: site.notes,
    latitude: site.latitude,
    longitude: site.longitude,
    radius_meters: site.radiusMeters,
    items,
  };
}
function validateSiteItems(items: ContractItemCommand[]): FieldViolation[] {
  const violations: FieldViolation[] = [];
  items.forEach((itemCommand, index) => {
    const item = buildContractItem(0, 0, itemCommand);
    for (const violation of item.assertValid()) {
      violations.push({ field: `items[${index}].${violation.field}`, message: violation.message });
    }
  });
  return violations;
}
function aScheduledShift(access: AccessContext, item: ContractItem, scheduledDate: Date): Shift {
  const shift = new Shift();
  shift.tenantId = access.tenantId;
  shift.contractItemId = item.id;
  shift.assigneeId = null;
  shift.teamId = null;
  shift.scheduledDate = scheduledDate;
  shift.completedAt = null;
  shift.latitude = null;
  shift.longitude = null;
  shift.capturedAt = null;
  shift.receiptPhotoUrl = null;
  shift.geoVerified = false;
  shift.fieldTokenUsedAt = null;
  shift.status = ShiftStatus.Scheduled;
  return shift;
}
function validate(command: ContractCreateCommand): FieldViolation[] {
  const violations: FieldViolation[] = [];
  if (command.sites.length === 0) {
    violations.push({ field: 'sites', message: 'At least one site is required' });
    return violations;
  }
  command.sites.forEach((site, siteIndex) => {
    if (site.items.length === 0) {
      violations.push({
        field: `sites[${siteIndex}].items`,
        message: 'At least one service item is required',
      });
      return;
    }
    site.items.forEach((itemCommand, itemIndex) => {
      const item = new ContractItem();
      item.setFrequency(
        itemCommand.frequencyCount,
        itemCommand.frequencyUnit,
        itemCommand.frequencyRule,
        itemCommand.dayOfWeek,
        itemCommand.dayOfMonth,
      );
      item.setUnitPrice(itemCommand.unitPrice);
      for (const violation of item.assertValid()) {
        violations.push({
          field: `sites[${siteIndex}].items[${itemIndex}].${violation.field}`,
          message: violation.message,
        });
      }
    });
  });
  return violations;
}
