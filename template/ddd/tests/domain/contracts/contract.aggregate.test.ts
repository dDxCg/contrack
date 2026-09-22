import { Money } from '../../../src/shared-kernel/money';
import { TenantId } from '../../../src/shared-kernel/tenant-id';
import { Contract } from '../../../src/contexts/contracts/domain/contract.aggregate';
import { ContractItem } from '../../../src/contexts/contracts/domain/contract-item.entity';
import { ContractSite } from '../../../src/contexts/contracts/domain/contract-site.entity';
import {
  ContractRequiresSiteError,
  ContractSiteRequiresItemError,
} from '../../../src/contexts/contracts/domain/errors';
import { Frequency } from '../../../src/contexts/contracts/domain/value-objects/frequency';
import { FrequencyUnit } from '../../../src/contexts/contracts/domain/value-objects/frequency-unit';

function anItem(name = 'Mow lawn'): ContractItem {
  return ContractItem.create({
    name,
    frequency: Frequency.create({ count: 1, unit: FrequencyUnit.Week, dayOfWeek: 1 }),
    unitPrice: Money.fromNumber(100),
  });
}

function aSiteWithItems(...items: ContractItem[]): ContractSite {
  return ContractSite.create({ name: 'Main site', items });
}

describe('Contract aggregate', () => {
  const tenantId = TenantId.of(1);
  const term = { signedAt: new Date('2026-01-01'), expiresAt: new Date('2026-12-31') };

  it('creates successfully with at least one site that has at least one item', () => {
    const contract = Contract.create({
      tenantId,
      customerId: 42,
      ...term,
      sites: [aSiteWithItems(anItem())],
    });
    expect(contract.sites).toHaveLength(1);
    expect(contract.sites[0].items).toHaveLength(1);
  });

  it('rejects a contract with zero sites', () => {
    expect(() =>
      Contract.create({ tenantId, customerId: 42, ...term, sites: [] }),
    ).toThrow(ContractRequiresSiteError);
  });

  it('rejects a contract whose site has zero items', () => {
    const emptySite = ContractSite.create({ name: 'Empty site', items: [] });
    expect(() =>
      Contract.create({ tenantId, customerId: 42, ...term, sites: [emptySite] }),
    ).toThrow(ContractSiteRequiresItemError);
  });

  it('reports which site index is missing items when there are multiple sites', () => {
    const goodSite = aSiteWithItems(anItem());
    const emptySite = ContractSite.create({ name: 'Empty site', items: [] });
    expect.assertions(2);
    try {
      Contract.create({ tenantId, customerId: 42, ...term, sites: [goodSite, emptySite] });
    } catch (error) {
      expect(error).toBeInstanceOf(ContractSiteRequiresItemError);
      expect((error as ContractSiteRequiresItemError).details.site_index).toBe(1);
    }
  });

  it('allows adding a site with no items after creation (addSite does not re-enforce the item-count rule)', () => {
    const contract = Contract.create({
      tenantId,
      customerId: 42,
      ...term,
      sites: [aSiteWithItems(anItem())],
    });
    const emptySite = ContractSite.create({ name: 'Second site', items: [] });
    expect(() => contract.addSite(emptySite)).not.toThrow();
    expect(contract.sites).toHaveLength(2);
  });

  it('findSite/findItem locate nested entities by id after ids are assigned', () => {
    const contract = Contract.create({
      tenantId,
      customerId: 42,
      ...term,
      sites: [aSiteWithItems(anItem())],
    });
    contract.assignId(1);
    contract.sites[0].assignId(10);
    contract.sites[0].items[0].assignId(100);
    expect(contract.findSite(10)).toBe(contract.sites[0]);
    expect(contract.findItem(100)).toBe(contract.sites[0].items[0]);
    expect(contract.findSite(999)).toBeUndefined();
    expect(contract.findItem(999)).toBeUndefined();
  });
});
