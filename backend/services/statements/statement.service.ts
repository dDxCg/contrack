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
import { ChannelClient, CHANNEL_CLIENT } from '../../data/channel-client/channel-client';
import {
  ObjectStorageClient,
  OBJECT_STORAGE_CLIENT,
} from '../../data/object-storage-client/object-storage-client';
import { PdfRenderer, PDF_RENDERER } from '../../data/pdf-renderer/pdf-renderer';
import { statementSentMessage } from './messages';

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
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRenderer,
    @Inject(OBJECT_STORAGE_CLIENT)
    private readonly objectStorageClient: ObjectStorageClient,
    @Inject(CHANNEL_CLIENT)
    private readonly channelClient: ChannelClient,
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
    pdfUrl: string;
  }> {
    const statement = await this.requireStatement(access, id);
    statement.export();

    const rows = await this.revenueRowsFor(access.tenantId, statement.contractId, statement.period);
    const pdf = await this.pdfRenderer.renderStatement({
      statementId: statement.id,
      contractId: statement.contractId,
      period: toDateString(statement.period),
      totalAmount: statement.totalAmount.toFixed(),
      lines: rows.map((row) => ({
        shiftId: row.id,
        scheduledDate: row.scheduledDate.toString(),
        hasEvidence: row.status === 'completed',
        amount: row.unitPrice.toFixed(),
      })),
    });

    const key = `statements/${access.tenantId}/${statement.id}.pdf`;
    await this.objectStorageClient.putObject({ key, contentType: 'application/pdf', body: pdf });
    const { url } = await this.objectStorageClient.presignDownload({ key });
    statement.pdfUrl = url;
    await this.statementRepository.update(statement);

    return { jobId: `statement-export-${statement.id}`, pdfUrl: url };
  }

  async send(access: AccessContext, id: number): Promise<StatementView> {
    const statement = await this.requireStatement(access, id);
    statement.send();

    const message = statementSentMessage(
      toDateString(statement.period),
      statement.totalAmount.toFixed(),
      statement.pdfUrl,
    );
    await this.channelClient.send(message);

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
