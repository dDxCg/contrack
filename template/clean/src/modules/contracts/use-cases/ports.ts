import { Contract } from '../entities/contract';
import { ContractItem } from '../entities/contract-item';
import { ContractSite } from '../entities/contract-site';

// Application business rules OWN their gateway interfaces (the dependency
// rule: inner layers declare the contracts outer layers must implement).
// frameworks-drivers/orm/*.repository.ts implements these against TypeORM;
// tests implement them as trivial in-memory fakes with zero framework
// dependency. Every method is tenant-scoped first, mirroring backend/
// repositories/tenant-scoped.repository.ts's pattern of taking tenantId as a
// mandatory first argument rather than trusting a global/session context.

export type TenantId = number;

export interface Page {
  limit: number;
  offset: number;
}

export interface PageOf<T> {
  items: T[];
  total: number;
}

/**
 * Persists and retrieves the Contract aggregate root (its own fields; sites
 * and items are handled by ContractSiteRepository/ContractItemRepository,
 * same split as the backend's three repositories).
 */
export interface ContractRepository {
  list(tenantId: TenantId, page: Page): Promise<PageOf<Contract>>;
  findById(tenantId: TenantId, id: number): Promise<Contract | null>;
  create(tenantId: TenantId, contract: Contract): Promise<Contract>;
  update(contract: Contract): Promise<Contract>;
  delete(tenantId: TenantId, id: number): Promise<void>;
}

export interface ContractSiteRepository {
  create(tenantId: TenantId, contractId: number, site: ContractSite): Promise<ContractSite>;
  findById(tenantId: TenantId, id: number): Promise<ContractSite | null>;
  listByContract(tenantId: TenantId, contractId: number): Promise<ContractSite[]>;
  update(site: ContractSite): Promise<ContractSite>;
  delete(tenantId: TenantId, id: number): Promise<void>;
}

export interface ContractItemRepository {
  create(tenantId: TenantId, siteId: number, item: ContractItem): Promise<ContractItem>;
  findById(tenantId: TenantId, id: number): Promise<ContractItem | null>;
  listBySite(tenantId: TenantId, siteId: number): Promise<ContractItem[]>;
  update(item: ContractItem): Promise<ContractItem>;
  delete(tenantId: TenantId, id: number): Promise<void>;
}
