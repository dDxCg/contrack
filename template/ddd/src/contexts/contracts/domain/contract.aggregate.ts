import { TenantId } from '../../../shared-kernel/tenant-id';
import { ContractItem } from './contract-item.entity';
import { ContractSite } from './contract-site.entity';
import { ContractRequiresSiteError, ContractSiteRequiresItemError } from './errors';

export enum ContractStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Renewed = 'renewed',
}

/**
 * Contract — aggregate root of the contracts bounded context.
 *
 * Ported from backend/models/contracts/contract.entity.ts plus the
 * validation that used to live in ContractService#create / the module-level
 * `validate()` helper in backend/services/contracts/contract.service.ts.
 *
 * This is the consistency boundary: ContractSite and ContractItem can only
 * be reached and mutated through the Contract instance that owns them (see
 * `sites` returning a readonly view, and `addSite`/`site.addItem` being the
 * only ways to grow the tree). `Contract.create(...)` is where the
 * "a contract needs >= 1 site, each site needs >= 1 item" invariant is
 * enforced — exactly the rule the original `validate()` function checked
 * before ContractAssembler ever touched the database. Once a contract
 * exists, `addSite` intentionally does NOT re-enforce "every site has an
 * item" (a site can be added first and populated with items afterwards),
 * mirroring ContractService#addSite in the original code, which only
 * validates the frequency rules of any items passed in, not their count.
 */
export class Contract {
  private readonly _sites: ContractSite[];

  private constructor(
    private _id: number | null,
    private readonly _tenantId: TenantId,
    private readonly _customerId: number,
    private _signedAt: Date,
    private _expiresAt: Date,
    private _status: ContractStatus,
    sites: ContractSite[],
  ) {
    this._sites = [...sites];
  }

  /**
   * Creates a brand-new Contract, enforcing the same "at least one site,
   * each site at least one item" rule as the original module-level
   * `validate()` in contract.service.ts. Throws ContractRequiresSiteError
   * or ContractSiteRequiresItemError (mapped to ValidationFailedError-style
   * reporting by the CreateContract use case) instead of returning a list
   * of field violations, since a Contract that fails this rule must never
   * exist as an object.
   */
  static create(params: {
    tenantId: TenantId;
    customerId: number;
    signedAt: Date;
    expiresAt: Date;
    sites: ContractSite[];
    status?: ContractStatus;
  }): Contract {
    if (params.sites.length === 0) {
      throw new ContractRequiresSiteError();
    }
    params.sites.forEach((site, index) => {
      if (site.items.length === 0) {
        throw new ContractSiteRequiresItemError(index);
      }
    });
    return new Contract(
      null,
      params.tenantId,
      params.customerId,
      params.signedAt,
      params.expiresAt,
      params.status ?? ContractStatus.Active,
      params.sites,
    );
  }

  /** Rehydrates a Contract already known to be valid (used by the repository when loading from storage). */
  static reconstitute(params: {
    id: number;
    tenantId: TenantId;
    customerId: number;
    signedAt: Date;
    expiresAt: Date;
    status: ContractStatus;
    sites: ContractSite[];
  }): Contract {
    return new Contract(
      params.id,
      params.tenantId,
      params.customerId,
      params.signedAt,
      params.expiresAt,
      params.status,
      params.sites,
    );
  }

  get id(): number | null {
    return this._id;
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get customerId(): number {
    return this._customerId;
  }

  get signedAt(): Date {
    return this._signedAt;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get status(): ContractStatus {
    return this._status;
  }

  get sites(): readonly ContractSite[] {
    return this._sites;
  }

  assignId(id: number): void {
    if (this._id !== null) {
      throw new Error(`Contract already has id ${this._id}`);
    }
    this._id = id;
  }

  addSite(site: ContractSite): void {
    this._sites.push(site);
  }

  changeTerm(signedAt: Date, expiresAt: Date): void {
    this._signedAt = signedAt;
    this._expiresAt = expiresAt;
  }

  changeExpiry(expiresAt: Date): void {
    this._expiresAt = expiresAt;
  }

  changeStatus(status: ContractStatus): void {
    this._status = status;
  }

  findSite(siteId: number): ContractSite | undefined {
    return this._sites.find((site) => site.id === siteId);
  }

  findItem(itemId: number): ContractItem | undefined {
    for (const site of this._sites) {
      const item = site.items.find((candidate) => candidate.id === itemId);
      if (item !== undefined) {
        return item;
      }
    }
    return undefined;
  }
}
