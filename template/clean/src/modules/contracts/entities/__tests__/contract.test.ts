import { Contract, ContractStatus } from '../contract';
import { ContractItem, FrequencyUnit } from '../contract-item';
import { ContractSite } from '../contract-site';
import { Money } from '../money';

function anItem(overrides: Partial<Parameters<typeof ContractItem.create>[0]> = {}): ContractItem {
  return ContractItem.create({
    tenantId: 1,
    name: 'Mopping',
    frequencyCount: 1,
    frequencyUnit: FrequencyUnit.Week,
    frequencyRule: null,
    dayOfWeek: null,
    dayOfMonth: null,
    unitPrice: Money.fromNumber(100),
    ...overrides,
  });
}

function aSite(items: ContractItem[] = [anItem()]): ContractSite {
  const site = new ContractSite({
    tenantId: 1,
    name: 'HQ',
    workRequirements: null,
    notes: null,
    latitude: null,
    longitude: null,
    radiusMeters: 200,
  });
  items.forEach((item) => site.addItem(item));
  return site;
}

function aContract(sites: ContractSite[] = []): Contract {
  const contract = new Contract({
    tenantId: 1,
    customerId: 1,
    signedAt: new Date('2026-01-01'),
    expiresAt: new Date('2026-12-31'),
    status: ContractStatus.Active,
  });
  sites.forEach((site) => contract.addSite(site));
  return contract;
}

describe('Contract — site/item invariants', () => {
  it('rejects a contract with zero sites', () => {
    const contract = aContract([]);
    expect(contract.validateForCreation()).toEqual([{ field: 'sites', message: 'At least one site is required' }]);
  });

  it('rejects a site with zero items', () => {
    const contract = aContract([aSite([])]);
    expect(contract.validateForCreation()).toContainEqual({
      field: 'sites[0].items',
      message: 'At least one service item is required',
    });
  });

  it('is valid with at least one site each with at least one valid item', () => {
    const contract = aContract([aSite([anItem()]), aSite([anItem({ name: 'Trash pickup' })])]);
    expect(contract.validateForCreation()).toEqual([]);
  });

  it('prefixes item violations with the site and item index, matching the API error shape', () => {
    const badItem = anItem({ frequencyCount: 0 });
    const contract = aContract([aSite([anItem()]), aSite([badItem])]);
    expect(contract.validateForCreation()).toContainEqual({
      field: 'sites[1].items[0].frequency_count',
      message: 'Frequency count must be a positive integer',
    });
  });

  it('setStatus and setTerm mutate in place', () => {
    const contract = aContract([aSite()]);
    contract.setStatus(ContractStatus.Cancelled);
    contract.setTerm(new Date('2026-02-01'), new Date('2027-02-01'));
    expect(contract.status).toBe(ContractStatus.Cancelled);
    expect(contract.signedAt).toEqual(new Date('2026-02-01'));
    expect(contract.expiresAt).toEqual(new Date('2027-02-01'));
  });
});
