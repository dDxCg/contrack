import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Statement, StatementStatus } from '../../models/statements/statement.entity';
import { Page, PageOf, TenantScopedRepository } from '../tenant-scoped.repository';
import { Money } from '../../utils/money';
export interface StatementListFilter {
  period?: string;
  status?: StatementStatus;
}
export interface IStatementRepository {
  list(tenantId: number, filter: StatementListFilter, page: Page): Promise<PageOf<Statement>>;
  findById(tenantId: number, id: number): Promise<Statement | null>;
  findByContractPeriod(tenantId: number, contractId: number, period: string): Promise<Statement | null>;
  findByContractPeriodBatch(
    tenantId: number,
    contractIds: readonly number[],
    period: string,
  ): Promise<Map<number, Statement>>;
  create(statement: Statement): Promise<Statement>;
  update(statement: Statement): Promise<Statement>;
}
@Injectable()
export class StatementRepository extends TenantScopedRepository<Statement> implements IStatementRepository {
  protected override readonly entity: EntityTarget<Statement> = Statement;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }
  async list(tenantId: number, filter: StatementListFilter, page: Page): Promise<PageOf<Statement>> {
    const query = this.selected(this.scopedTo(tenantId, 'st'));
    if (filter.period !== undefined) {
      query.andWhere('st.period = :period', { period: filter.period });
    }
    if (filter.status !== undefined) {
      query.andWhere('sts.code = :status', { status: filter.status });
    }
    const rows = await query
      .orderBy('st.id', 'ASC')
      .limit(page.limit)
      .offset(page.offset)
      .getRawMany<StatementRow>();
    const total = await this.scopedTo(tenantId, 'st').getCount();
    return { items: rows.map(hydrateStatement), total };
  }
  async findById(tenantId: number, id: number): Promise<Statement | null> {
    const row = await this.selected(this.scopedTo(tenantId, 'st'))
      .andWhere('st.id = :id', { id })
      .getRawOne<StatementRow>();
    return row === undefined || row === null ? null : hydrateStatement(row);
  }
  async findByContractPeriod(
    tenantId: number,
    contractId: number,
    period: string,
  ): Promise<Statement | null> {
    const row = await this.selected(this.scopedTo(tenantId, 'st'))
      .andWhere('st.contract_id = :contractId', { contractId })
      .andWhere('st.period = :period', { period })
      .getRawOne<StatementRow>();
    return row === undefined || row === null ? null : hydrateStatement(row);
  }
  async findByContractPeriodBatch(
    tenantId: number,
    contractIds: readonly number[],
    period: string,
  ): Promise<Map<number, Statement>> {
    if (contractIds.length === 0) {
      return new Map();
    }
    const rows = await this.selected(this.scopedTo(tenantId, 'st'))
      .andWhere('st.contract_id IN (:...contractIds)', { contractIds: [...contractIds] })
      .andWhere('st.period = :period', { period })
      .getRawMany<StatementRow>();
    return new Map(rows.map((row) => [row.contract_id, hydrateStatement(row)]));
  }
  async create(statement: Statement): Promise<Statement> {
    statement.statusId = await this.lookupId('statement_statuses', statement.status);
    const saved = await this.dataSource.getRepository(Statement).save(statement);
    const reloaded = await this.findById(saved.tenantId, saved.id);
    if (reloaded === null) {
      throw new Error(`statements row ${saved.id} disappeared right after it was written`);
    }
    return reloaded;
  }
  async update(statement: Statement): Promise<Statement> {
    statement.statusId = await this.lookupId('statement_statuses', statement.status);
    const saved = await this.dataSource.getRepository(Statement).save(statement);
    const reloaded = await this.findById(saved.tenantId, saved.id);
    if (reloaded === null) {
      throw new Error(`statements row ${saved.id} disappeared right after it was written`);
    }
    return reloaded;
  }
  private selected(query: SelectQueryBuilder<Statement>): SelectQueryBuilder<Statement> {
    return query
      .innerJoin('statement_statuses', 'sts', 'sts.id = st.status_id')
      .select([
        'st.id AS id',
        'st.tenant_id AS tenant_id',
        'st.contract_id AS contract_id',
        'st.period AS period',
        'st.total_amount AS total_amount',
        'st.status_id AS status_id',
        'st.pdf_url AS pdf_url',
        'st.created_at AS created_at',
        'sts.code AS status',
      ]);
  }
}
interface StatementRow {
  id: number;
  tenant_id: number;
  contract_id: number;
  period: Date;
  total_amount: string;
  status_id: number;
  pdf_url: string | null;
  created_at: Date;
  status: StatementStatus;
}
function hydrateStatement(row: StatementRow): Statement {
  const statement = new Statement();
  statement.id = row.id;
  statement.tenantId = row.tenant_id;
  statement.contractId = row.contract_id;
  statement.period = row.period;
  statement.totalAmount = Money.fromString(row.total_amount);
  statement.statusId = row.status_id;
  statement.pdfUrl = row.pdf_url;
  statement.createdAt = row.created_at;
  statement.status = row.status;
  return statement;
}
