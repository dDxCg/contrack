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
import { Contract } from '../../models/contracts/contract.entity';
import { ContractItem, FrequencyUnit } from '../../models/contracts/contract-item.entity';
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
import { Page } from '../../repositories/tenant-scoped.repository';
import { AccessContext } from '../access-control/access-context';
import { fireAlert } from '../alerts/alert-firer';
import { toDateString } from '../../utils/period';
import { AssembledContract, ContractAssembler } from './contract-assembler';
// MVP conflict signal (unimplemented-audit.md "Schedule generation"): more than this many shifts
// landing on the same site on the same calendar day, across every contract, fires a one-time
// site_overload alert for a human to look at — no auto-rebalancing. See docs/03-architecture.md
// §11 R3 for the full auto-rebalance plan this is deliberately not attempting yet.
const SITE_OVERLOAD_THRESHOLD = 3;
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
    const { view, overloadedSiteIds } = await this.dataSource.transaction((tx) =>
      this.persist(access, assembled, tx),
    );
    for (const siteId of overloadedSiteIds) {
      await fireAlert(
        { alertRepository: this.alertRepository, channelClient: this.channelClient },
        access.tenantId,
        AlertKind.SiteOverload,
        siteId,
      );
    }
    return view;
  }
  private async persist(
    access: AccessContext,
    assembled: AssembledContract,
    tx: EntityManager,
  ): Promise<{ view: ContractView; overloadedSiteIds: number[] }> {
    const savedContract = await this.contractRepository.create(assembled.entity, tx);
    const siteViews: ContractSiteView[] = [];
    const generatedShifts: Shift[] = [];
    const siteDatesTouched = new Set<string>();
    for (const site of assembled.sites) {
      site.entity.contractId = savedContract.id;
      const savedSite = await this.contractSiteRepository.create(site.entity, tx);
      const itemViews: ContractItemView[] = [];
      for (const item of site.items) {
        item.entity.siteId = savedSite.id;
        const savedItem = await this.contractItemRepository.create(item.entity, tx);
        itemViews.push(toContractItemView(savedItem));
        for (const date of item.scheduledDates) {
          generatedShifts.push(aScheduledShift(access, savedItem, date));
          siteDatesTouched.add(`${savedItem.siteId}|${toDateString(date)}`);
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
    await this.shiftRepository.createMany(generatedShifts, tx);
    const overloadedSiteIds = new Set<number>();
    for (const key of siteDatesTouched) {
      const [siteIdText, date] = key.split('|');
      const siteId = Number(siteIdText);
      const count = await this.shiftRepository.countForSiteOnDate(access.tenantId, siteId, date, tx);
      if (count > SITE_OVERLOAD_THRESHOLD) {
        overloadedSiteIds.add(siteId);
      }
    }
    return { view: toContractView(savedContract, siteViews), overloadedSiteIds: [...overloadedSiteIds] };
  }
  async delete(access: AccessContext, id: number): Promise<void> {
    await this.requireContract(access, id);
    await this.contractRepository.delete(access.tenantId, id);
  }
  private async requireContract(access: AccessContext, id: number): Promise<Contract> {
    const contract = await this.contractRepository.findById(access.tenantId, id);
    if (contract === null) {
      throw new AuthOutOfScopeException();
    }
    return contract;
  }
}
function aScheduledShift(access: AccessContext, item: ContractItem, scheduledDate: Date): Shift {
  const shift = new Shift();
  shift.tenantId = access.tenantId;
  shift.contractItemId = item.id;
  shift.assigneeId = null;
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
