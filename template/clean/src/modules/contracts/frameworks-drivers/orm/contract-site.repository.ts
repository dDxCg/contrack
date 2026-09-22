import { DataSource, Repository } from 'typeorm';
import { ContractSite } from '../../entities/contract-site';
import { ContractSiteRepository, TenantId } from '../../use-cases/ports';
import { ContractSiteOrmEntity } from './contract-site.orm-entity';

export class TypeOrmContractSiteRepository implements ContractSiteRepository {
  private readonly repo: Repository<ContractSiteOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ContractSiteOrmEntity);
  }

  async create(tenantId: TenantId, contractId: number, site: ContractSite): Promise<ContractSite> {
    const row = this.repo.create(toRow(tenantId, contractId, site));
    const saved = await this.repo.save(row);
    return toDomain(saved);
  }

  async findById(tenantId: TenantId, id: number): Promise<ContractSite | null> {
    const row = await this.repo.findOneBy({ id, tenantId });
    return row === null ? null : toDomain(row);
  }

  async listByContract(tenantId: TenantId, contractId: number): Promise<ContractSite[]> {
    const rows = await this.repo.find({ where: { tenantId, contractId }, order: { id: 'ASC' } });
    return rows.map(toDomain);
  }

  async update(site: ContractSite): Promise<ContractSite> {
    const row = toRow(site.tenantId, site.contractId as number, site);
    row.id = site.id as number;
    const saved = await this.repo.save(row);
    return toDomain(saved);
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}

function toRow(tenantId: TenantId, contractId: number, site: ContractSite): ContractSiteOrmEntity {
  const row = new ContractSiteOrmEntity();
  row.tenantId = tenantId;
  row.contractId = contractId;
  row.name = site.name;
  row.workRequirements = site.workRequirements;
  row.notes = site.notes;
  row.latitude = site.latitude === null ? null : String(site.latitude);
  row.longitude = site.longitude === null ? null : String(site.longitude);
  row.radiusMeters = site.radiusMeters;
  return row;
}

function toDomain(row: ContractSiteOrmEntity): ContractSite {
  return new ContractSite({
    id: row.id,
    tenantId: row.tenantId,
    contractId: row.contractId,
    name: row.name,
    workRequirements: row.workRequirements,
    notes: row.notes,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    radiusMeters: row.radiusMeters,
    createdAt: row.createdAt,
  });
}
