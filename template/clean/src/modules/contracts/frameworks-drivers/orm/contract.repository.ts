import { DataSource, Repository } from 'typeorm';
import { Contract, ContractStatus } from '../../entities/contract';
import { ContractRepository, Page, PageOf, TenantId } from '../../use-cases/ports';
import { ContractOrmEntity } from './contract.orm-entity';

// Implements the use-case-owned ContractRepository gateway against TypeORM.
// Every query is tenant-scoped first, mirroring backend/repositories/
// tenant-scoped.repository.ts's pattern.
export class TypeOrmContractRepository implements ContractRepository {
  private readonly repo: Repository<ContractOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ContractOrmEntity);
  }

  async list(tenantId: TenantId, page: Page): Promise<PageOf<Contract>> {
    const [rows, total] = await this.repo.findAndCount({
      where: { tenantId },
      order: { id: 'ASC' },
      take: page.limit,
      skip: page.offset,
    });
    return { items: rows.map(toDomain), total };
  }

  async findById(tenantId: TenantId, id: number): Promise<Contract | null> {
    const row = await this.repo.findOneBy({ id, tenantId });
    return row === null ? null : toDomain(row);
  }

  async create(tenantId: TenantId, contract: Contract): Promise<Contract> {
    const row = this.repo.create(toRow(tenantId, contract));
    const saved = await this.repo.save(row);
    return toDomain(saved);
  }

  async update(contract: Contract): Promise<Contract> {
    const row = toRow(contract.tenantId, contract);
    row.id = contract.id as number;
    const saved = await this.repo.save(row);
    return toDomain(saved);
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}

function toRow(tenantId: TenantId, contract: Contract): ContractOrmEntity {
  const row = new ContractOrmEntity();
  row.tenantId = tenantId;
  row.customerId = contract.customerId;
  row.signedAt = contract.signedAt.toISOString().slice(0, 10);
  row.expiresAt = contract.expiresAt.toISOString().slice(0, 10);
  row.status = contract.status;
  return row;
}

function toDomain(row: ContractOrmEntity): Contract {
  return new Contract({
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    signedAt: new Date(row.signedAt),
    expiresAt: new Date(row.expiresAt),
    status: row.status as ContractStatus,
    createdAt: row.createdAt,
  });
}
