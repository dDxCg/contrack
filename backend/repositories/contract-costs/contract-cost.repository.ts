import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { ContractCost, CostCategory } from '../../models/contract-costs/contract-cost.entity';
import { TenantScopedRepository } from '../tenant-scoped.repository';
import { Money } from '../../utils/money';

export interface IContractCostRepository {
  findById(tenantId: number, id: number): Promise<ContractCost | null>;
  listByContract(tenantId: number, contractId: number, period?: string): Promise<ContractCost[]>;
  upsert(cost: ContractCost): Promise<ContractCost>;
  monthlyTotalsBefore(
    tenantId: number,
    contractId: number,
    beforePeriod: string,
    limit: number,
  ): Promise<Money[]>;
  totalForMonth(tenantId: number, contractId: number, period: string): Promise<Money | null>;
  tenantTotalCost(tenantId: number): Promise<Money>;
}

@Injectable()
export class ContractCostRepository
  extends TenantScopedRepository<ContractCost>
  implements IContractCostRepository
{
  protected override readonly entity: EntityTarget<ContractCost> = ContractCost;

  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }

  async findById(tenantId: number, id: number): Promise<ContractCost | null> {
    const row = await this.selected(this.scopedTo(tenantId, 'cc'))
      .andWhere('cc.id = :id', { id })
      .getRawOne<ContractCostRow>();

    return row === undefined || row === null ? null : hydrateContractCost(row);
  }

  async listByContract(tenantId: number, contractId: number, period?: string): Promise<ContractCost[]> {
    const query = this.selected(this.scopedTo(tenantId, 'cc')).andWhere('cc.contract_id = :contractId', {
      contractId,
    });

    if (period !== undefined) {
      query.andWhere('cc.period = :period', { period });
    }

    const rows = await query.orderBy('cc.period', 'DESC').getRawMany<ContractCostRow>();

    return rows.map(hydrateContractCost);
  }

  async upsert(cost: ContractCost): Promise<ContractCost> {
    cost.categoryId = await this.lookupId('cost_categories', cost.category);
    const existing = await this.dataSource.getRepository(ContractCost).findOne({
      where: {
        tenantId: cost.tenantId,
        contractId: cost.contractId,
        categoryId: cost.categoryId,
        period: cost.period,
      },
    });

    if (existing !== null) {
      cost.id = existing.id;
    }

    const saved = await this.dataSource.getRepository(ContractCost).save(cost);
    const reloaded = await this.findById(saved.tenantId, saved.id);

    if (reloaded === null) {
      throw new Error(`contract_costs row ${saved.id} disappeared right after it was written`);
    }

    return reloaded;
  }

  async monthlyTotalsBefore(
    tenantId: number,
    contractId: number,
    beforePeriod: string,
    limit: number,
  ): Promise<Money[]> {
    const rows = await this.scopedTo(tenantId, 'cc')
      .andWhere('cc.contract_id = :contractId', { contractId })
      .andWhere('cc.period < :beforePeriod', { beforePeriod })
      .groupBy('cc.period')
      .orderBy('cc.period', 'DESC')
      .limit(limit)
      .select('SUM(cc.amount)', 'total')
      .getRawMany<{
        total: string;
      }>();

    return rows.map((row) => Money.fromString(row.total));
  }

  async totalForMonth(tenantId: number, contractId: number, period: string): Promise<Money | null> {
    const rows = await this.scopedTo(tenantId, 'cc')
      .andWhere('cc.contract_id = :contractId', { contractId })
      .andWhere('cc.period = :period', { period })
      .select('cc.amount', 'amount')
      .getRawMany<{
        amount: string;
      }>();

    if (rows.length === 0) {
      return null;
    }

    return Money.sumOf(rows.map((row) => Money.fromString(row.amount)));
  }

  async tenantTotalCost(tenantId: number): Promise<Money> {
    const row = await this.scopedTo(tenantId, 'cc').select('COALESCE(SUM(cc.amount), 0)', 'total').getRawOne<{
      total: string;
    }>();

    return Money.fromString(row?.total ?? '0');
  }

  private selected(query: SelectQueryBuilder<ContractCost>): SelectQueryBuilder<ContractCost> {
    return query
      .innerJoin('cost_categories', 'cat', 'cat.id = cc.category_id')
      .select([
        'cc.id AS id',
        'cc.tenant_id AS tenant_id',
        'cc.contract_id AS contract_id',
        'cc.category_id AS category_id',
        'cc.period AS period',
        'cc.amount AS amount',
        'cc.created_by AS created_by',
        'cc.created_at AS created_at',
        'cat.code AS category',
      ]);
  }
}

interface ContractCostRow {
  id: number;
  tenant_id: number;
  contract_id: number;
  category_id: number;
  period: Date;
  amount: string;
  created_by: number;
  created_at: Date;
  category: CostCategory;
}

function hydrateContractCost(row: ContractCostRow): ContractCost {
  const cost = new ContractCost();
  cost.id = row.id;
  cost.tenantId = row.tenant_id;
  cost.contractId = row.contract_id;
  cost.categoryId = row.category_id;
  cost.period = row.period;
  cost.amount = Money.fromString(row.amount);
  cost.createdBy = row.created_by;
  cost.createdAt = row.created_at;
  cost.category = row.category;

  return cost;
}
