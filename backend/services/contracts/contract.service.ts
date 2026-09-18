import { Injectable } from '@nestjs/common';
import {
  ContractItemView,
  ContractSiteView,
  ContractView,
  ContractPage,
} from '../../dtos/contracts/contracts.response.dto';
import {
  AuthOutOfScopeException,
  FieldViolation,
  ValidationFailedException,
} from '../../models/domain-errors';
import { Contract, ContractStatus } from '../../models/contracts/contract.entity';
import { ContractItem, FrequencyUnit } from '../../models/contracts/contract-item.entity';
import { ContractSite } from '../../models/contracts/contract-site.entity';
import { Shift, ShiftStatus } from '../../models/shifts/shift.entity';
import { ContractItemRepository } from '../../repositories/contracts/contract-item.repository';
import { ContractRepository } from '../../repositories/contracts/contract.repository';
import { ContractSiteRepository } from '../../repositories/contracts/contract-site.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { Page } from '../../repositories/tenant-scoped.repository';
import { AccessContext } from '../access-control/access-context';
import { ScheduleGeneratorService } from './schedule-generator.service';
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
    private readonly contractRepository: ContractRepository,
    private readonly contractSiteRepository: ContractSiteRepository,
    private readonly contractItemRepository: ContractItemRepository,
    private readonly shiftRepository: ShiftRepository,
    private readonly scheduleGenerator: ScheduleGeneratorService,
  ) {}
  async list(access: AccessContext, page: Page): Promise<ContractPage> {
    const { items, total } = await this.contractRepository.list(access.tenantId, page);
    return {
      items: items.map((contract) => toContractView(contract, [])),
      total,
      limit: page.limit,
      offset: page.offset,
    };
  }
  async get(access: AccessContext, id: number): Promise<ContractView> {
    return toContractView(await this.requireContract(access, id), []);
  }
  async create(access: AccessContext, command: ContractCreateCommand): Promise<ContractView> {
    const violations = validate(command);
    if (violations.length > 0) {
      throw new ValidationFailedException(violations);
    }
    const contract = new Contract();
    contract.tenantId = access.tenantId;
    contract.customerId = command.customerId;
    contract.setTerm(command.signedAt, command.expiresAt);
    contract.setStatus(ContractStatus.Active);
    const savedContract = await this.contractRepository.create(contract);
    const siteViews: ContractSiteView[] = [];
    const generatedShifts: Shift[] = [];
    for (const siteCommand of command.sites) {
      const site = new ContractSite();
      site.tenantId = access.tenantId;
      site.contractId = savedContract.id;
      site.setName(siteCommand.name);
      site.setWorkRequirements(siteCommand.workRequirements);
      site.setNotes(siteCommand.notes);
      const savedSite = await this.contractSiteRepository.create(site);
      const itemViews: ContractItemView[] = [];
      for (const itemCommand of siteCommand.items) {
        const item = new ContractItem();
        item.tenantId = access.tenantId;
        item.siteId = savedSite.id;
        item.setName(itemCommand.name);
        item.setFrequency(itemCommand.frequencyCount, itemCommand.frequencyUnit, itemCommand.frequencyRule);
        item.setUnitPrice(itemCommand.unitPrice);
        const savedItem = await this.contractItemRepository.create(item);
        itemViews.push(toContractItemView(savedItem));
        for (const scheduledDate of this.scheduleGenerator.generate(
          { from: savedContract.signedAt, to: savedContract.expiresAt },
          { frequencyCount: savedItem.frequencyCount, frequencyUnit: savedItem.frequencyUnit },
        )) {
          const shift = new Shift();
          shift.tenantId = access.tenantId;
          shift.contractItemId = savedItem.id;
          shift.assigneeId = null;
          shift.scheduledDate = scheduledDate;
          shift.completedAt = null;
          shift.latitude = null;
          shift.longitude = null;
          shift.capturedAt = null;
          shift.receiptPhotoUrl = null;
          shift.status = ShiftStatus.Scheduled;
          generatedShifts.push(shift);
        }
      }
      siteViews.push({
        id: savedSite.id,
        name: savedSite.name,
        work_requirements: savedSite.workRequirements,
        notes: savedSite.notes,
        items: itemViews,
      });
    }
    await this.shiftRepository.createMany(generatedShifts);
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
function toContractItemView(item: ContractItem): ContractItemView {
  return {
    id: item.id,
    name: item.name,
    frequency_count: item.frequencyCount,
    frequency_unit: item.frequencyUnit,
    frequency_rule: item.frequencyRule,
    unit_price: item.unitPrice,
  };
}
function toContractView(contract: Contract, sites: ContractSiteView[]): ContractView {
  return {
    id: contract.id,
    customer_id: contract.customerId,
    signed_at: contract.signedAt.toString(),
    expires_at: contract.expiresAt.toString(),
    status: contract.status,
    sites,
  };
}
