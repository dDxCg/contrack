import { Statement } from '../../models/statements/statement.entity';
import { RevenueRow } from '../../repositories/shifts/shift.repository';
import { StatementLineView, StatementView } from './statements.response.dto';

export function toLine(row: RevenueRow): StatementLineView {
  return {
    shift_id: row.id,
    scheduled_date: row.scheduledDate.toString(),
    has_evidence: row.status === 'completed',
    amount: row.unitPrice.toNumber(),
  };
}

export function toStatementView(statement: Statement, lines: StatementLineView[]): StatementView {
  return {
    id: statement.id,
    contract_id: statement.contractId,
    period: statement.period.toString(),
    total_amount: statement.totalAmount.toNumber(),
    status: statement.status,
    pdf_url: statement.pdfUrl,
    lines,
  };
}
