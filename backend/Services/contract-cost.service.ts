import { Injectable } from '@nestjs/common';
import { ContractCost, CostCategory } from '../Models/contract-cost.entity';
import { ContractCostRepository } from '../Repositories/contract-cost.repository';
import { AccessContext } from './AccessControl/access-context';
import { toDateString } from './period';

export interface UpsertCostCommand {
  category: CostCategory;
  period: Date;
  amount: number;
}

export interface ContractCostView {
  id: number;
  contract_id: number;
  category: CostCategory;
  period: string;
  amount: number;
  recorded_by: number;
  recorded_at: string;
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

  /** Replaces any existing entry for (contract, category, period) — FR14. */
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
    cost.amount = command.amount;
    cost.createdBy = access.employee.id;

    return toContractCostView(await this.contractCostRepository.upsert(cost));
  }
}

function toContractCostView(cost: ContractCost): ContractCostView {
  return {
    id: cost.id,
    contract_id: cost.contractId,
    category: cost.category,
    period: cost.period.toString(),
    amount: cost.amount,
    recorded_by: cost.createdBy,
    recorded_at: cost.createdAt.toString(),
  };
}
