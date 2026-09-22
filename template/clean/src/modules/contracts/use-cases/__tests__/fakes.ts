import { Contract } from '../../entities/contract';
import { ContractItem } from '../../entities/contract-item';
import { ContractSite } from '../../entities/contract-site';
import { ContractItemRepository, ContractRepository, ContractSiteRepository, Page, PageOf, TenantId } from '../ports';

// In-memory fakes implementing the use-case-owned gateway interfaces. No
// NestJS, no TypeORM, no database — this is the whole point of the
// dependency rule: use-case tests never need a framework or a DB.
let nextContractId = 1;
let nextSiteId = 1;
let nextItemId = 1;

export class InMemoryContractRepository implements ContractRepository {
  private readonly rows = new Map<number, Contract>();

  async list(tenantId: TenantId, page: Page): Promise<PageOf<Contract>> {
    const items = [...this.rows.values()].filter((c) => c.tenantId === tenantId).map(bareContractOf);
    return { items: items.slice(page.offset, page.offset + page.limit), total: items.length };
  }

  async findById(tenantId: TenantId, id: number): Promise<Contract | null> {
    const row = this.rows.get(id);
    return row && row.tenantId === tenantId ? bareContractOf(row) : null;
  }

  async create(tenantId: TenantId, contract: Contract): Promise<Contract> {
    const id = nextContractId++;
    const saved = new Contract({
      id,
      tenantId,
      customerId: contract.customerId,
      signedAt: contract.signedAt,
      expiresAt: contract.expiresAt,
      status: contract.status,
    });
    this.rows.set(id, saved);
    return saved;
  }

  async update(contract: Contract): Promise<Contract> {
    this.rows.set(contract.id as number, contract);
    return contract;
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    const row = this.rows.get(id);
    if (row && row.tenantId === tenantId) {
      this.rows.delete(id);
    }
  }
}

// A real repository backed by a real query never returns a Contract with
// sites already attached — ContractRepository only owns the contract row's
// own fields (see use-cases/ports.ts). Stripping any sites the caller may
// have attached to the object it handed to create()/update() keeps this
// fake honest about that, instead of accidentally leaking whatever an
// earlier use case mutated onto the same in-memory object.
function bareContractOf(contract: Contract): Contract {
  return new Contract({
    id: contract.id,
    tenantId: contract.tenantId,
    customerId: contract.customerId,
    signedAt: contract.signedAt,
    expiresAt: contract.expiresAt,
    status: contract.status,
    createdAt: contract.createdAt,
  });
}

export class InMemoryContractSiteRepository implements ContractSiteRepository {
  private readonly rows = new Map<number, ContractSite>();

  async create(tenantId: TenantId, contractId: number, site: ContractSite): Promise<ContractSite> {
    const id = nextSiteId++;
    const saved = new ContractSite({
      id,
      tenantId,
      contractId,
      name: site.name,
      workRequirements: site.workRequirements,
      notes: site.notes,
      latitude: site.latitude,
      longitude: site.longitude,
      radiusMeters: site.radiusMeters,
    });
    this.rows.set(id, saved);
    return saved;
  }

  async findById(tenantId: TenantId, id: number): Promise<ContractSite | null> {
    const row = this.rows.get(id);
    return row && row.tenantId === tenantId ? bareSiteOf(row) : null;
  }

  async listByContract(tenantId: TenantId, contractId: number): Promise<ContractSite[]> {
    return [...this.rows.values()]
      .filter((s) => s.tenantId === tenantId && s.contractId === contractId)
      .map(bareSiteOf);
  }

  async update(site: ContractSite): Promise<ContractSite> {
    this.rows.set(site.id as number, site);
    return site;
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    const row = this.rows.get(id);
    if (row && row.tenantId === tenantId) {
      this.rows.delete(id);
    }
  }
}

// Same reasoning as bareContractOf: a real repository never returns a site
// with items already attached — those belong to ContractItemRepository.
function bareSiteOf(site: ContractSite): ContractSite {
  return new ContractSite({
    id: site.id,
    tenantId: site.tenantId,
    contractId: site.contractId,
    name: site.name,
    workRequirements: site.workRequirements,
    notes: site.notes,
    latitude: site.latitude,
    longitude: site.longitude,
    radiusMeters: site.radiusMeters,
    createdAt: site.createdAt,
  });
}

export class InMemoryContractItemRepository implements ContractItemRepository {
  private readonly rows = new Map<number, ContractItem>();

  async create(tenantId: TenantId, siteId: number, item: ContractItem): Promise<ContractItem> {
    const id = nextItemId++;
    const saved = new ContractItem({
      id,
      tenantId,
      siteId,
      name: item.name,
      frequencyCount: item.frequencyCount,
      frequencyUnit: item.frequencyUnit,
      frequencyRule: item.frequencyRule,
      dayOfWeek: item.dayOfWeek,
      dayOfMonth: item.dayOfMonth,
      unitPrice: item.unitPrice,
    });
    this.rows.set(id, saved);
    return saved;
  }

  async findById(tenantId: TenantId, id: number): Promise<ContractItem | null> {
    const row = this.rows.get(id);
    return row && row.tenantId === tenantId ? row : null;
  }

  async listBySite(tenantId: TenantId, siteId: number): Promise<ContractItem[]> {
    return [...this.rows.values()].filter((i) => i.tenantId === tenantId && i.siteId === siteId);
  }

  async update(item: ContractItem): Promise<ContractItem> {
    this.rows.set(item.id as number, item);
    return item;
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    const row = this.rows.get(id);
    if (row && row.tenantId === tenantId) {
      this.rows.delete(id);
    }
  }
}
