import { Injectable } from '@nestjs/common';
import { Contract, ContractStatus } from '../../models/contracts/contract.entity';
import { ContractItem } from '../../models/contracts/contract-item.entity';
import { ContractSite } from '../../models/contracts/contract-site.entity';
import { AccessContext } from '../access-control/access-context';
import { ContractCreateCommand, ContractItemCommand, ContractSiteCommand } from './contract.service';
import { ScheduleGeneratorService } from './schedule-generator.service';
export interface AssembledItem {
  entity: ContractItem;
  scheduledDates: Date[];
}
export interface AssembledSite {
  entity: ContractSite;
  items: AssembledItem[];
}
export interface AssembledContract {
  entity: Contract;
  sites: AssembledSite[];
}
@Injectable()
export class ContractAssembler {
  constructor(private readonly scheduleGenerator: ScheduleGeneratorService) {}
  assemble(access: AccessContext, command: ContractCreateCommand): AssembledContract {
    const contract = new Contract();
    contract.tenantId = access.tenantId;
    contract.customerId = command.customerId;
    contract.setTerm(command.signedAt, command.expiresAt);
    contract.setStatus(ContractStatus.Active);
    return {
      entity: contract,
      sites: command.sites.map((siteCommand) => this.assembleSite(access, contract, siteCommand)),
    };
  }
  private assembleSite(
    access: AccessContext,
    contract: Contract,
    siteCommand: ContractSiteCommand,
  ): AssembledSite {
    const site = new ContractSite();
    site.tenantId = access.tenantId;
    site.setName(siteCommand.name);
    site.setWorkRequirements(siteCommand.workRequirements);
    site.setNotes(siteCommand.notes);
    return {
      entity: site,
      items: siteCommand.items.map((itemCommand) => this.assembleItem(access, contract, itemCommand)),
    };
  }
  private assembleItem(
    access: AccessContext,
    contract: Contract,
    itemCommand: ContractItemCommand,
  ): AssembledItem {
    const item = new ContractItem();
    item.tenantId = access.tenantId;
    item.setName(itemCommand.name);
    item.setFrequency(itemCommand.frequencyCount, itemCommand.frequencyUnit, itemCommand.frequencyRule);
    item.setUnitPrice(itemCommand.unitPrice);
    const scheduledDates = this.scheduleGenerator.generate(
      { from: contract.signedAt, to: contract.expiresAt },
      { frequencyCount: item.frequencyCount, frequencyUnit: item.frequencyUnit },
    );
    return { entity: item, scheduledDates };
  }
}
