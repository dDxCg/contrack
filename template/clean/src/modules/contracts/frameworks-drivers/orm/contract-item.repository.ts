import { DataSource, Repository } from 'typeorm';
import { ContractItem, FrequencyUnit } from '../../entities/contract-item';
import { Money } from '../../entities/money';
import { ContractItemRepository, TenantId } from '../../use-cases/ports';
import { ContractItemOrmEntity } from './contract-item.orm-entity';

export class TypeOrmContractItemRepository implements ContractItemRepository {
  private readonly repo: Repository<ContractItemOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ContractItemOrmEntity);
  }

  async create(tenantId: TenantId, siteId: number, item: ContractItem): Promise<ContractItem> {
    const row = this.repo.create(toRow(tenantId, siteId, item));
    const saved = await this.repo.save(row);
    return toDomain(saved);
  }

  async findById(tenantId: TenantId, id: number): Promise<ContractItem | null> {
    const row = await this.repo.findOneBy({ id, tenantId });
    return row === null ? null : toDomain(row);
  }

  async listBySite(tenantId: TenantId, siteId: number): Promise<ContractItem[]> {
    const rows = await this.repo.find({ where: { tenantId, siteId }, order: { id: 'ASC' } });
    return rows.map(toDomain);
  }

  async update(item: ContractItem): Promise<ContractItem> {
    const row = toRow(item.tenantId, item.siteId as number, item);
    row.id = item.id as number;
    const saved = await this.repo.save(row);
    return toDomain(saved);
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}

function toRow(tenantId: TenantId, siteId: number, item: ContractItem): ContractItemOrmEntity {
  const row = new ContractItemOrmEntity();
  row.tenantId = tenantId;
  row.siteId = siteId;
  row.name = item.name;
  row.frequencyCount = item.frequencyCount;
  row.frequencyUnit = item.frequencyUnit;
  row.frequencyRule = item.frequencyRule;
  row.dayOfWeek = item.dayOfWeek;
  row.dayOfMonth = item.dayOfMonth;
  row.unitPrice = item.unitPrice.toFixed();
  return row;
}

function toDomain(row: ContractItemOrmEntity): ContractItem {
  return new ContractItem({
    id: row.id,
    tenantId: row.tenantId,
    siteId: row.siteId,
    name: row.name,
    frequencyCount: row.frequencyCount,
    frequencyUnit: row.frequencyUnit as FrequencyUnit,
    frequencyRule: row.frequencyRule,
    dayOfWeek: row.dayOfWeek,
    dayOfMonth: row.dayOfMonth,
    unitPrice: Money.fromString(row.unitPrice),
    createdAt: row.createdAt,
  });
}
