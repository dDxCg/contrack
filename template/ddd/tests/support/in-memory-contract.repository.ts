import { Contract } from '../../src/contexts/contracts/domain/contract.aggregate';
import { ContractRepositoryPort, Page, PageOf } from '../../src/contexts/contracts/domain/contract-repository.port';
import { TenantId } from '../../src/shared-kernel/tenant-id';

/**
 * InMemoryContractRepository — the fake ContractRepositoryPort implementation
 * used by every application-layer test. It is exactly what the README's
 * "why domain/ and application/ have zero framework deps" claim cashes out
 * to: use-cases can be exercised end-to-end with no NestJS module, no
 * TypeORM DataSource and no database at all.
 */
export class InMemoryContractRepository implements ContractRepositoryPort {
  private readonly byId = new Map<number, Contract>();
  private nextContractId = 1;
  private nextSiteId = 1;
  private nextItemId = 1;

  async findById(tenantId: TenantId, id: number): Promise<Contract | null> {
    const contract = this.byId.get(id);
    if (contract === undefined || !contract.tenantId.equals(tenantId)) {
      return null;
    }
    return contract;
  }

  async list(tenantId: TenantId, page: Page): Promise<PageOf<Contract>> {
    const all = [...this.byId.values()]
      .filter((contract) => contract.tenantId.equals(tenantId))
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    return {
      items: all.slice(page.offset, page.offset + page.limit),
      total: all.length,
    };
  }

  async create(contract: Contract): Promise<Contract> {
    contract.assignId(this.nextContractId++);
    this.assignChildIds(contract);
    this.byId.set(contract.id as number, contract);
    return contract;
  }

  async update(contract: Contract): Promise<Contract> {
    this.assignChildIds(contract);
    this.byId.set(contract.id as number, contract);
    return contract;
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    const contract = this.byId.get(id);
    if (contract !== undefined && contract.tenantId.equals(tenantId)) {
      this.byId.delete(id);
    }
  }

  private assignChildIds(contract: Contract): void {
    for (const site of contract.sites) {
      if (site.id === null) {
        site.assignId(this.nextSiteId++);
      }
      for (const item of site.items) {
        if (item.id === null) {
          item.assignId(this.nextItemId++);
        }
      }
    }
  }
}
