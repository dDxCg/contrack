import { Money } from '../../../../shared-kernel/money';
import { Contract } from '../../domain/contract.aggregate';
import { ContractItem } from '../../domain/contract-item.entity';
import { ContractSite } from '../../domain/contract-site.entity';
import { Frequency } from '../../domain/value-objects/frequency';
import {
  ContractItemInput,
  ContractItemView,
  ContractSiteInput,
  ContractSiteView,
  ContractView,
} from './contract.dto';

/** Builds a domain ContractItem from an application-layer input DTO. Throws InvalidFrequencyError via Frequency.create() if the frequency rules are violated. */
export function toContractItem(input: ContractItemInput): ContractItem {
  return ContractItem.create({
    name: input.name,
    frequency: Frequency.create({
      count: input.frequencyCount,
      unit: input.frequencyUnit,
      rule: input.frequencyRule,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
    }),
    unitPrice: Money.fromNumber(input.unitPrice),
  });
}

/** Builds a domain ContractSite (with its items) from an application-layer input DTO. */
export function toContractSite(input: ContractSiteInput): ContractSite {
  return ContractSite.create({
    name: input.name,
    workRequirements: input.workRequirements,
    notes: input.notes,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters: input.radiusMeters,
    items: input.items.map(toContractItem),
  });
}

export function toContractItemView(item: ContractItem): ContractItemView {
  if (item.id === null) {
    throw new Error('Cannot build a ContractItemView for an unpersisted ContractItem');
  }
  return {
    id: item.id,
    name: item.name,
    frequencyCount: item.frequency.count,
    frequencyUnit: item.frequency.unit,
    frequencyRule: item.frequency.rule,
    dayOfWeek: item.frequency.dayOfWeek,
    dayOfMonth: item.frequency.dayOfMonth,
    unitPrice: item.unitPrice.toNumber(),
  };
}

export function toContractSiteView(site: ContractSite): ContractSiteView {
  if (site.id === null) {
    throw new Error('Cannot build a ContractSiteView for an unpersisted ContractSite');
  }
  return {
    id: site.id,
    name: site.name,
    workRequirements: site.workRequirements,
    notes: site.notes,
    latitude: site.latitude,
    longitude: site.longitude,
    radiusMeters: site.radiusMeters,
    items: site.items.map(toContractItemView),
  };
}

export function toContractView(contract: Contract): ContractView {
  if (contract.id === null) {
    throw new Error('Cannot build a ContractView for an unpersisted Contract');
  }
  return {
    id: contract.id,
    customerId: contract.customerId,
    signedAt: contract.signedAt,
    expiresAt: contract.expiresAt,
    status: contract.status,
    sites: contract.sites.map(toContractSiteView),
  };
}
