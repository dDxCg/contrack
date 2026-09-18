import { Injectable } from '@nestjs/common';
import { ContractCostView } from '../../dtos/contract-costs/contract-costs.response.dto';
import { toContractCostView } from '../../dtos/contract-costs/contract-costs.mapper';
import { ContractCost, CostCategory } from '../../models/contract-costs/contract-cost.entity';
import { ContractCostRepository } from '../../repositories/contract-costs/contract-cost.repository';
import { AccessContext } from '../access-control/access-context';
import { toDateString } from '../../utils/period';
import { Money } from '../../utils/money';
export interface UpsertCostCommand {
  category: CostCategory;
  period: Date;
  amount: number;
}
@Injectable()
export class ContractCostService {
  constructor(private readonly contractCostRepository: ContractCostRepository) {}
  async list(access: AccessContext, contractId: number, period?: Date): Promise<ContractCostView[]> {
    const rows = await this.contractCostRepository.listByContract(
      access.tenantId,
      contractId,
      period === undefined ? undefined : toDateString(period),
    );
    return rows.map(toContractCostView);
  }
  async upsert(
    access: AccessContext,
    contractId: number,
    command: UpsertCostCommand,
  ): Promise<ContractCostView> {
    const cost = new ContractCost();
    cost.tenantId = access.tenantId;
    cost.contractId = contractId;
    cost.category = command.category;
    cost.period = command.period;
    cost.amount = Money.fromNumber(command.amount);
    cost.createdBy = access.employee.id;
    return toContractCostView(await this.contractCostRepository.upsert(cost));
  }
}
