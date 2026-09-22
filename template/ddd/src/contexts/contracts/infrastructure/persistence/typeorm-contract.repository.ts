import { Repository } from 'typeorm';
import { TenantId } from '../../../../shared-kernel/tenant-id';
import { Contract } from '../../domain/contract.aggregate';
import { ContractRepositoryPort, Page, PageOf } from '../../domain/contract-repository.port';
import { ContractOrmEntity } from './contract.orm-entity';
import { toDomainContract, toOrmContract } from './contract.persistence-mapper';

const RELATIONS = ['sites', 'sites.items'];

/**
 * TypeOrmContractRepository — infrastructure/persistence adapter.
 *
 * Implements ContractRepositoryPort using a plain TypeORM Repository. This
 * is the ONLY class in the codebase that knows both the domain Contract
 * shape and the ORM entity shape — everything else (application/use-cases,
 * domain/) talks to ContractRepositoryPort and never imports this file or
 * `typeorm` directly.
 *
 * Relies on `cascade: true` on the sites/items OneToMany relations (see
 * contract.orm-entity.ts / contract-site.orm-entity.ts) so a single
 * `save()` call persists the whole aggregate tree in one round trip,
 * matching the "save the aggregate as a whole" contract of
 * ContractRepositoryPort.
 */
export class TypeOrmContractRepository implements ContractRepositoryPort {
  constructor(private readonly repository: Repository<ContractOrmEntity>) {}

  async findById(tenantId: TenantId, id: number): Promise<Contract | null> {
    const row = await this.repository.findOne({
      where: { id, tenantId: tenantId.toNumber() },
      relations: RELATIONS,
    });
    return row === null ? null : toDomainContract(row);
  }

  async list(tenantId: TenantId, page: Page): Promise<PageOf<Contract>> {
    const [rows, total] = await this.repository.findAndCount({
      where: { tenantId: tenantId.toNumber() },
      relations: RELATIONS,
      order: { id: 'ASC' },
      take: page.limit,
      skip: page.offset,
    });
    return { items: rows.map(toDomainContract), total };
  }

  async create(contract: Contract): Promise<Contract> {
    const row = toOrmContract(contract);
    const saved = await this.repository.save(row);
    return this.reload(saved.id, contract.tenantId);
  }

  async update(contract: Contract): Promise<Contract> {
    const row = toOrmContract(contract);
    const saved = await this.repository.save(row);
    return this.reload(saved.id, contract.tenantId);
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    await this.repository.delete({ id, tenantId: tenantId.toNumber() });
  }

  private async reload(id: number, tenantId: TenantId): Promise<Contract> {
    const reloaded = await this.findById(tenantId, id);
    if (reloaded === null) {
      throw new Error(`contracts row ${id} disappeared right after it was written`);
    }
    return reloaded;
  }
}
