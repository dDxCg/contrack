import { CostCategory } from '../../models/contract-costs/contract-cost.entity';

export interface ContractCostView {
  id: number;
  contract_id: number;
  category: CostCategory;
  period: string;
  amount: number;
  recorded_by: number;
  recorded_at: string;
}

export interface ContractProfitMonthView {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
  is_estimated: boolean;
}
