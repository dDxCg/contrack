import { AddContractSiteUseCase } from '../add-contract-site.use-case';
import { CreateContractUseCase } from '../create-contract.use-case';
import { GetContractDetailUseCase } from '../get-contract-detail.use-case';
import { ContractNotFoundError } from '../../entities/errors';
import { FrequencyUnit } from '../../entities/contract-item';
import { InMemoryContractItemRepository, InMemoryContractRepository, InMemoryContractSiteRepository } from './fakes';

function anItemInput() {
  return {
    name: 'Mopping',
    frequencyCount: 1,
    frequencyUnit: FrequencyUnit.Week,
    frequencyRule: null,
    dayOfWeek: null,
    dayOfMonth: null,
    unitPrice: 100,
  };
}

describe('GetContractDetailUseCase', () => {
  it('throws ContractNotFoundError for another tenant’s contract (tenant scoping)', async () => {
    const contracts = new InMemoryContractRepository();
    const sites = new InMemoryContractSiteRepository();
    const items = new InMemoryContractItemRepository();
    const { contract } = await new CreateContractUseCase(contracts, sites, items).execute({
      tenantId: 1,
      customerId: 1,
      signedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
      sites: [
        {
          name: 'HQ',
          workRequirements: null,
          notes: null,
          latitude: null,
          longitude: null,
          radiusMeters: 200,
          items: [anItemInput()],
        },
      ],
    });

    const getContractDetail = new GetContractDetailUseCase(contracts, sites, items);
    await expect(getContractDetail.execute({ tenantId: 2, contractId: contract.id as number })).rejects.toThrow(
      ContractNotFoundError,
    );
  });

  it('assembles the contract together with its sites and items added afterward', async () => {
    const contracts = new InMemoryContractRepository();
    const sites = new InMemoryContractSiteRepository();
    const items = new InMemoryContractItemRepository();
    const { contract } = await new CreateContractUseCase(contracts, sites, items).execute({
      tenantId: 1,
      customerId: 1,
      signedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
      sites: [
        {
          name: 'HQ',
          workRequirements: null,
          notes: null,
          latitude: null,
          longitude: null,
          radiusMeters: 200,
          items: [anItemInput()],
        },
      ],
    });

    const addSite = new AddContractSiteUseCase(contracts, sites, items);
    await addSite.execute({
      tenantId: 1,
      contractId: contract.id as number,
      name: 'Warehouse',
      workRequirements: null,
      notes: null,
      latitude: null,
      longitude: null,
      radiusMeters: 200,
      items: [anItemInput()],
    });

    const getContractDetail = new GetContractDetailUseCase(contracts, sites, items);
    const { contract: detail } = await getContractDetail.execute({
      tenantId: 1,
      contractId: contract.id as number,
    });
    // One site from create(), one from the later addSite() call.
    expect(detail.sites).toHaveLength(2);
    expect(detail.sites.map((site) => site.name).sort()).toEqual(['HQ', 'Warehouse']);
    expect(detail.sites.every((site) => site.items.length === 1)).toBe(true);
  });
});
