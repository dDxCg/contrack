import { TenantId } from '../../../shared-kernel/tenant-id';
import { Contract } from './contract.aggregate';

export interface Page {
  limit: number;
  offset: number;
}

export interface PageOf<T> {
  items: T[];
  total: number;
}

/**
 * ContractRepositoryPort — outbound port owned by the domain layer.
 *
 * This is an interface only: no TypeORM types, no SQL, nothing that could
 * make application/ or domain/ depend on infrastructure/. The concrete
 * TypeOrmContractRepository in infrastructure/persistence implements this
 * exact interface: application/use-cases depend on THIS file, never on the
 * TypeORM class, which is how tests in tests/application/ run a use case
 * against a plain in-memory fake with zero database.
 *
 * Every method takes a TenantId first, mirroring
 * backend/repositories/tenant-scoped.repository.ts's rule that no query can
 * be written without naming the tenant it is scoped to.
 *
 * The aggregate (Contract, with its ContractSite/ContractItem children) is
 * saved and loaded as a whole — `create`/`update` persist the full tree in
 * one call, which is the DDD "one repository per aggregate root" rule. The
 * original backend has three separate repositories (contract, site, item)
 * because it works directly against the relational schema; this port
 * intentionally collapses that back down to the aggregate boundary.
 */
export interface ContractRepositoryPort {
  findById(tenantId: TenantId, id: number): Promise<Contract | null>;
  list(tenantId: TenantId, page: Page): Promise<PageOf<Contract>>;
  create(contract: Contract): Promise<Contract>;
  update(contract: Contract): Promise<Contract>;
  delete(tenantId: TenantId, id: number): Promise<void>;
}

/** DI token for ContractRepositoryPort — infrastructure/http/contracts.module.ts binds this to TypeOrmContractRepository. Use-cases depend on the interface type above, never on this token directly except at wiring time. */
export const CONTRACT_REPOSITORY = Symbol('CONTRACT_REPOSITORY');
