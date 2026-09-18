import { Inject, Injectable } from '@nestjs/common';
import { StatementView, StatementPage } from '../../dtos/statements/statements.response.dto';
import { toLine, toStatementView } from '../../dtos/statements/statements.mapper';
import { pageOf } from '../../dtos/page.dto';
import {
  AuthOutOfScopeException,
  StatementAlreadyExistsException,
  StatementPeriodIncompleteException,
} from '../../models/domain-errors';
import { Statement, StatementStatus } from '../../models/statements/statement.entity';
import { ContractRepository, IContractRepository } from '../../repositories/contracts/contract.repository';
import { IShiftRepository, RevenueRow, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { Page } from '../../repositories/tenant-scoped.repository';
import {
  IStatementRepository,
  StatementListFilter,
  StatementRepository,
} from '../../repositories/statements/statement.repository';
import { ITenantRepository, TenantRepository } from '../../repositories/tenants/tenant.repository';
import { withUniqueViolation } from '../../repositories/unique-violation';
import { AccessContext } from '../access-control/access-context';
import { addMonthsUTC, startOfMonthInZone, toDateString } from '../../utils/period';
import { Money } from '../../utils/money';
export interface ComputeStatementCommand {
  contractId: number;
  period: Date;
}
@Injectable()
export class StatementService {
  constructor(
    @Inject(StatementRepository)
    private readonly statementRepository: IStatementRepository,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(ContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(TenantRepository)
    private readonly tenantRepository: ITenantRepository,
  ) {}
  async list(access: AccessContext, filter: StatementListFilter, page: Page): Promise<StatementPage> {
    const { items, total } = await this.statementRepository.list(access.tenantId, filter, page);
    return pageOf(
      items.map((statement) => toStatementView(statement, [])),
      total,
      page,
    );
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
    const timezone = await this.tenantRepository.timezoneOf(access.tenantId);
    const period = startOfMonthInZone(command.period, timezone);
    const periodStart = toDateString(period);
    const existing = await this.statementRepository.findByContractPeriod(
      access.tenantId,
      command.contractId,
      periodStart,
    );
    if (existing !== null) {
      throw new StatementAlreadyExistsException(existing.id);
    }
    const rows = await this.revenueRowsFor(access.tenantId, command.contractId, period);
    assertPeriodComplete(rows);
    const statement = new Statement();
    statement.tenantId = access.tenantId;
    statement.contractId = command.contractId;
    statement.period = period;
    statement.totalAmount = Money.sumOf(rows.map((row) => row.unitPrice));
    statement.pdfUrl = null;
    statement.status = StatementStatus.Draft;
    const saved = await withUniqueViolation(
      () => this.statementRepository.create(statement),
      () => new StatementAlreadyExistsException(-1),
    );
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
