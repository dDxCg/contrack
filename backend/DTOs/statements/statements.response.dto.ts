import { StatementStatus } from '../../models/statements/statement.entity';
export interface StatementLineView {
  shift_id: number;
  scheduled_date: string;
  has_evidence: boolean;
  amount: number;
}
export interface StatementView {
  id: number;
  contract_id: number;
  period: string;
  total_amount: number;
  status: StatementStatus;
  pdf_url: string | null;
  lines: StatementLineView[];
}
export interface StatementPage {
  items: StatementView[];
  total: number;
  limit: number;
  offset: number;
}
export interface ReconciliationRowView {
  contract_id: number;
  shifts_due: number;
  shifts_with_evidence: number;
  variance: number;
}
