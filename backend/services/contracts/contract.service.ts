import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
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
import { Contract } from '../../models/contracts/contract.entity';
import { ContractItem, FrequencyUnit } from '../../models/contracts/contract-item.entity';
import { Shift, ShiftStatus } from '../../models/shifts/shift.entity';
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
import { AssembledContract, ContractAssembler } from './contract-assembler';
export interface ContractItemCommand {
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  unitPrice: number;
}
export interface ContractSiteCommand {
  name: string;
  workRequirements: string | null;
  notes: string | null;
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
    return this.dataSource.transaction((tx) => this.persist(access, assembled, tx));
  }
  private async persist(
    access: AccessContext,
    assembled: AssembledContract,
    tx: EntityManager,
  ): Promise<ContractView> {
    const savedContract = await this.contractRepository.create(assembled.entity, tx);
    const siteViews: ContractSiteView[] = [];
    const generatedShifts: Shift[] = [];
    for (const site of assembled.sites) {
      site.entity.contractId = savedContract.id;
      const savedSite = await this.contractSiteRepository.create(site.entity, tx);
      const itemViews: ContractItemView[] = [];
      for (const item of site.items) {
        item.entity.siteId = savedSite.id;
        const savedItem = await this.contractItemRepository.create(item.entity, tx);
        itemViews.push(toContractItemView(savedItem));
        generatedShifts.push(...item.scheduledDates.map((date) => aScheduledShift(access, savedItem, date)));
      }
      siteViews.push({
        id: savedSite.id,
        name: savedSite.name,
        work_requirements: savedSite.workRequirements,
        notes: savedSite.notes,
        items: itemViews,
      });
    }
    await this.shiftRepository.createMany(generatedShifts, tx);
    return toContractView(savedContract, siteViews);
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
      item.setFrequency(itemCommand.frequencyCount, itemCommand.frequencyUnit, itemCommand.frequencyRule);
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
