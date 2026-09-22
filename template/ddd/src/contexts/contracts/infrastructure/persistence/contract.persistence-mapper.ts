import { Money } from '../../../../shared-kernel/money';
import { TenantId } from '../../../../shared-kernel/tenant-id';
import { Contract, ContractStatus } from '../../domain/contract.aggregate';
import { ContractItem } from '../../domain/contract-item.entity';
import { ContractSite } from '../../domain/contract-site.entity';
import { Frequency } from '../../domain/value-objects/frequency';
import { FrequencyUnit } from '../../domain/value-objects/frequency-unit';
import { ContractItemOrmEntity } from './contract-item.orm-entity';
import { ContractOrmEntity } from './contract.orm-entity';
import { ContractSiteOrmEntity } from './contract-site.orm-entity';

/**
 * Explicit domain <-> persistence mapping functions. Nothing here is
 * implicit or annotation-driven: a change to either the domain aggregate or
 * the ORM entity forces a visible, reviewable change to exactly one of
 * these functions instead of a decorator silently drifting.
 */

export function toOrmContract(contract: Contract): ContractOrmEntity {
  const row = new ContractOrmEntity();
  if (contract.id !== null) {
    row.id = contract.id;
  }
  row.tenantId = contract.tenantId.toNumber();
  row.customerId = contract.customerId;
  row.signedAt = toDateString(contract.signedAt);
  row.expiresAt = toDateString(contract.expiresAt);
  row.status = contract.status;
  row.sites = contract.sites.map((site) => toOrmSite(site, row.tenantId));
  return row;
}

export function toOrmSite(site: ContractSite, tenantId: number): ContractSiteOrmEntity {
  const row = new ContractSiteOrmEntity();
  if (site.id !== null) {
    row.id = site.id;
  }
  row.tenantId = tenantId;
  row.name = site.name;
  row.workRequirements = site.workRequirements;
  row.notes = site.notes;
  row.latitude = site.latitude === null ? null : String(site.latitude);
  row.longitude = site.longitude === null ? null : String(site.longitude);
  row.radiusMeters = site.radiusMeters;
  row.items = site.items.map((item) => toOrmItem(item, tenantId));
  return row;
}

export function toOrmItem(item: ContractItem, tenantId: number): ContractItemOrmEntity {
  const row = new ContractItemOrmEntity();
  if (item.id !== null) {
    row.id = item.id;
  }
  row.tenantId = tenantId;
  row.name = item.name;
  row.frequencyCount = item.frequency.count;
  row.frequencyUnit = item.frequency.unit;
  row.frequencyRule = item.frequency.rule;
  row.dayOfWeek = item.frequency.dayOfWeek;
  row.dayOfMonth = item.frequency.dayOfMonth;
  row.unitPrice = item.unitPrice.toFixed();
  return row;
}

export function toDomainContract(row: ContractOrmEntity): Contract {
  return Contract.reconstitute({
    id: row.id,
    tenantId: TenantId.of(row.tenantId),
    customerId: row.customerId,
    signedAt: new Date(row.signedAt),
    expiresAt: new Date(row.expiresAt),
    status: row.status as ContractStatus,
    sites: (row.sites ?? []).map(toDomainSite),
  });
}

export function toDomainSite(row: ContractSiteOrmEntity): ContractSite {
  return ContractSite.create({
    id: row.id,
    name: row.name,
    workRequirements: row.workRequirements,
    notes: row.notes,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    radiusMeters: row.radiusMeters,
    items: (row.items ?? []).map(toDomainItem),
  });
}

export function toDomainItem(row: ContractItemOrmEntity): ContractItem {
  return ContractItem.create({
    id: row.id,
    name: row.name,
    frequency: Frequency.create({
      count: row.frequencyCount,
      unit: row.frequencyUnit as FrequencyUnit,
      rule: row.frequencyRule,
      dayOfWeek: row.dayOfWeek,
      dayOfMonth: row.dayOfMonth,
    }),
    unitPrice: Money.fromString(row.unitPrice),
  });
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
