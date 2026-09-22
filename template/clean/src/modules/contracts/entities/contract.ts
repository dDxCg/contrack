import { ContractSite } from './contract-site';
import { FieldViolation } from './errors';

// Ported from backend/models/contracts/contract.entity.ts, minus TypeORM
// decorators. Contract is the aggregate root: it is the entity that owns and
// enforces the "at least one site, each site at least one item, every item's
// frequency internally consistent" invariant (backend/services/contracts/
// contract.service.ts's validate()) — the use-case layer calls
// Contract.validateForCreation() rather than re-implementing the rule.
export enum ContractStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Renewed = 'renewed',
}

export interface ContractProps {
  id?: number;
  tenantId: number;
  customerId: number;
  signedAt: Date;
  expiresAt: Date;
  status: ContractStatus;
  sites?: ContractSite[];
  createdAt?: Date;
}

export class Contract {
  readonly id?: number;
  readonly tenantId: number;
  readonly customerId: number;
  private _signedAt: Date;
  private _expiresAt: Date;
  private _status: ContractStatus;
  private _sites: ContractSite[];
  readonly createdAt?: Date;

  constructor(props: ContractProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.customerId = props.customerId;
    this._signedAt = props.signedAt;
    this._expiresAt = props.expiresAt;
    this._status = props.status;
    this._sites = props.sites ?? [];
    this.createdAt = props.createdAt;
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

  setTerm(signedAt: Date, expiresAt: Date): void {
    this._signedAt = signedAt;
    this._expiresAt = expiresAt;
  }

  setStatus(status: ContractStatus): void {
    this._status = status;
  }

  addSite(site: ContractSite): void {
    this._sites.push(site);
  }

  /**
   * A contract must have at least one site, and every site must have at
   * least one service item, and every item's own fields must be valid.
   * Mirrors backend/services/contracts/contract.service.ts's module-level
   * `validate()` function, field-path for field-path, so API error payloads
   * stay identical in shape.
   */
  validateForCreation(): FieldViolation[] {
    const violations: FieldViolation[] = [];
    if (this._sites.length === 0) {
      violations.push({ field: 'sites', message: 'At least one site is required' });
      return violations;
    }
    this._sites.forEach((site, siteIndex) => {
      if (site.items.length === 0) {
        violations.push({
          field: `sites[${siteIndex}].items`,
          message: 'At least one service item is required',
        });
        return;
      }
      site.items.forEach((item, itemIndex) => {
        for (const violation of item.assertValid()) {
          violations.push({
            field: `sites[${siteIndex}].items[${itemIndex}].${violation.field}`,
            message: violation.message,
          });
        }
      });
    });
    return violations;
  }
}
