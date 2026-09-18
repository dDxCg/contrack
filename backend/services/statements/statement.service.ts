import { Injectable } from '@nestjs/common';
import {
  StatementLineView,
  StatementView,
  StatementPage,
} from '../../dtos/statements/statements.response.dto';
import {
  AuthOutOfScopeException,
  StatementAlreadyExistsException,
  StatementPeriodIncompleteException,
} from '../../models/domain-errors';
import { Statement, StatementStatus } from '../../models/statements/statement.entity';
import { ContractRepository } from '../../repositories/contracts/contract.repository';
import { RevenueRow, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { Page } from '../../repositories/tenant-scoped.repository';
import { StatementListFilter, StatementRepository } from '../../repositories/statements/statement.repository';
import { AccessContext } from '../access-control/access-context';
import { addMonthsUTC, round2, toDateString } from '../../utils/period';
export interface ComputeStatementCommand {
  contractId: number;
  period: Date;
}
@Injectable()
export class StatementService {
  constructor(
    private readonly statementRepository: StatementRepository,
    private readonly shiftRepository: ShiftRepository,
    private readonly contractRepository: ContractRepository,
  ) {}
  async list(access: AccessContext, filter: StatementListFilter, page: Page): Promise<StatementPage> {
    const { items, total } = await this.statementRepository.list(access.tenantId, filter, page);
    return {
      items: items.map((statement) => toStatementView(statement, [])),
      total,
      limit: page.limit,
      offset: page.offset,
    };
  }
  async get(access: AccessContext, id: number): Promise<StatementView> {
    const statement = await this.requireStatement(access, id);
    const rows = await this.revenueRowsFor(access.tenantId, statement.contractId, statement.period);
    return toStatementView(statement, rows.map(toLine));
  }
  async compute(access: AccessContext, command: ComputeStatementCommand): Promise<StatementView> {
    const contract = await this.contractRepository.findById(access.tenantId, command.contractId);
    if (contract === null) {
      throw new AuthOutOfScopeException();
    }
    const periodStart = toDateString(command.period);
    const existing = await this.statementRepository.findByContractPeriod(
      access.tenantId,
      command.contractId,
      periodStart,
    );
    if (existing !== null) {
      throw new StatementAlreadyExistsException(existing.id);
    }
    const rows = await this.revenueRowsFor(access.tenantId, command.contractId, command.period);
    assertPeriodComplete(rows);
    const statement = new Statement();
    statement.tenantId = access.tenantId;
    statement.contractId = command.contractId;
    statement.period = command.period;
    statement.totalAmount = round2(rows.reduce((sum, row) => sum + row.unitPrice, 0));
    statement.pdfUrl = null;
    statement.status = StatementStatus.Draft;
    const saved = await this.statementRepository.create(statement);
    return toStatementView(saved, rows.map(toLine));
  }
  async export(
    access: AccessContext,
    id: number,
  ): Promise<{
    jobId: string;
  }> {
    const statement = await this.requireStatement(access, id);
    statement.export();
    await this.statementRepository.update(statement);
    return { jobId: `statement-export-${statement.id}` };
  }
  async send(access: AccessContext, id: number): Promise<StatementView> {
    const statement = await this.requireStatement(access, id);
    statement.send();
    const saved = await this.statementRepository.update(statement);
    const rows = await this.revenueRowsFor(access.tenantId, saved.contractId, saved.period);
    return toStatementView(saved, rows.map(toLine));
  }
  private async revenueRowsFor(tenantId: number, contractId: number, period: Date): Promise<RevenueRow[]> {
    const from = toDateString(period);
    const to = toDateString(addMonthsUTC(period, 1));
    return this.shiftRepository.revenueRows(tenantId, contractId, from, to);
  }
  private async requireStatement(access: AccessContext, id: number): Promise<Statement> {
    const statement = await this.statementRepository.findById(access.tenantId, id);
    if (statement === null) {
      throw new AuthOutOfScopeException();
    }
    return statement;
  }
}
function assertPeriodComplete(rows: readonly RevenueRow[]): void {
  const blocking = rows.filter((row) => row.status !== 'completed').map((row) => row.id);
  if (blocking.length > 0) {
    throw new StatementPeriodIncompleteException(blocking);
  }
}
function toLine(row: RevenueRow): StatementLineView {
  return {
    shift_id: row.id,
    scheduled_date: row.scheduledDate.toString(),
    has_evidence: row.status === 'completed',
    amount: row.unitPrice,
  };
}
function toStatementView(statement: Statement, lines: StatementLineView[]): StatementView {
  return {
    id: statement.id,
    contract_id: statement.contractId,
    period: statement.period.toString(),
    total_amount: statement.totalAmount,
    status: statement.status,
    pdf_url: statement.pdfUrl,
    lines,
  };
}
