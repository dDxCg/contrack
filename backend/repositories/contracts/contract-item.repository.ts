import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { ContractItem, FrequencyUnit } from '../../models/contracts/contract-item.entity';
import { Money } from '../../utils/money';
import { TenantScopedRepository } from '../tenant-scoped.repository';
export interface IContractItemRepository {
  create(item: ContractItem, tx?: EntityManager): Promise<ContractItem>;
  findById(tenantId: number, id: number, tx?: EntityManager): Promise<ContractItem | null>;
  update(item: ContractItem, tx?: EntityManager): Promise<ContractItem>;
  delete(tenantId: number, id: number, tx?: EntityManager): Promise<void>;
  listBySite(tenantId: number, siteId: number, tx?: EntityManager): Promise<ContractItem[]>;
}
@Injectable()
export class ContractItemRepository
  extends TenantScopedRepository<ContractItem>
  implements IContractItemRepository
{
  protected override readonly entity: EntityTarget<ContractItem> = ContractItem;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }
  async create(item: ContractItem, tx?: EntityManager): Promise<ContractItem> {
    item.frequencyUnitId = await this.lookupId('frequency_units', item.frequencyUnit, tx);
    return this.mgr(tx).getRepository(ContractItem).save(item);
  }
  async findById(tenantId: number, id: number, tx?: EntityManager): Promise<ContractItem | null> {
    const row = await this.selected(tenantId, tx).andWhere('i.id = :id', { id }).getRawOne<ContractItemRow>();
    return row === undefined || row === null ? null : hydrateContractItem(row);
  }
  async update(item: ContractItem, tx?: EntityManager): Promise<ContractItem> {
    item.frequencyUnitId = await this.lookupId('frequency_units', item.frequencyUnit, tx);
    await this.mgr(tx).getRepository(ContractItem).save(item);
    const reloaded = await this.findById(item.tenantId, item.id, tx);
    if (reloaded === null) {
      throw new Error(`contract_items row ${item.id} disappeared right after it was written`);
    }
    return reloaded;
  }
  async delete(tenantId: number, id: number, tx?: EntityManager): Promise<void> {
    await this.mgr(tx).getRepository(ContractItem).delete({ id, tenantId });
  }
  async listBySite(tenantId: number, siteId: number, tx?: EntityManager): Promise<ContractItem[]> {
    const rows = await this.selected(tenantId, tx)
      .andWhere('i.site_id = :siteId', { siteId })
      .orderBy('i.id', 'ASC')
      .getRawMany<ContractItemRow>();
    return rows.map(hydrateContractItem);
  }
  private selected(tenantId: number, tx?: EntityManager): SelectQueryBuilder<ContractItem> {
    return this.scopedTo(tenantId, 'i', tx)
      .innerJoin('frequency_units', 'fu', 'fu.id = i.frequency_unit_id')
      .select([
        'i.id AS id',
        'i.tenant_id AS tenant_id',
        'i.site_id AS site_id',
        'i.name AS name',
        'i.frequency_count AS frequency_count',
        'i.frequency_unit_id AS frequency_unit_id',
        'i.frequency_rule AS frequency_rule',
        'i.day_of_week AS day_of_week',
        'i.day_of_month AS day_of_month',
        'i.unit_price AS unit_price',
        'i.created_at AS created_at',
        'fu.code AS frequency_unit',
      ]);
  }
}
interface ContractItemRow {
  id: number;
  tenant_id: number;
  site_id: number;
  name: string;
  frequency_count: number;
  frequency_unit_id: number;
  frequency_rule: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  unit_price: string;
  created_at: Date;
  frequency_unit: FrequencyUnit;
}
function hydrateContractItem(row: ContractItemRow): ContractItem {
  const item = new ContractItem();
  item.id = row.id;
  item.tenantId = row.tenant_id;
  item.siteId = row.site_id;
  item.name = row.name;
  item.frequencyCount = row.frequency_count;
  item.frequencyUnitId = row.frequency_unit_id;
  item.frequencyUnit = row.frequency_unit;
  item.frequencyRule = row.frequency_rule;
  item.dayOfWeek = row.day_of_week;
  item.dayOfMonth = row.day_of_month;
  item.unitPrice = Money.fromString(row.unit_price);
  item.createdAt = row.created_at;
  return item;
}
