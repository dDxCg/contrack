import { ContractCost } from '../../models/contract-costs/contract-cost.entity';
import { ContractCostView } from './contract-costs.response.dto';
export function toContractCostView(cost: ContractCost): ContractCostView {
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
