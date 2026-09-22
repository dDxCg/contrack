import { AddContractSiteUseCase } from '../add-contract-site.use-case';
import { CreateContractUseCase } from '../create-contract.use-case';
import { ContractNotFoundError, ValidationFailedError } from '../../entities/errors';
import { FrequencyUnit } from '../../entities/contract-item';
import {
  InMemoryContractItemRepository,
  InMemoryContractRepository,
  InMemoryContractSiteRepository,
} from './fakes';

async function createBaseContract(contracts: InMemoryContractRepository, sitesRepo: InMemoryContractSiteRepository, itemsRepo: InMemoryContractItemRepository) {
  const { contract } = await new CreateContractUseCase(contracts, sitesRepo, itemsRepo).execute({
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
        items: [
          {
            name: 'Mopping',
            frequencyCount: 1,
            frequencyUnit: FrequencyUnit.Week,
            frequencyRule: null,
            dayOfWeek: null,
            dayOfMonth: null,
            unitPrice: 100,
          },
        ],
      },
    ],
  });
  return contract;
}

describe('AddContractSiteUseCase', () => {
  it('throws ContractNotFoundError for a contract that does not exist in this tenant', async () => {
    const contracts = new InMemoryContractRepository();
    const sites = new InMemoryContractSiteRepository();
    const items = new InMemoryContractItemRepository();
    const useCase = new AddContractSiteUseCase(contracts, sites, items);
    await expect(
      useCase.execute({
        tenantId: 1,
        contractId: 999,
        name: 'Warehouse',
        workRequirements: null,
        notes: null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
        items: [],
      }),
    ).rejects.toThrow(ContractNotFoundError);
  });

  it('allows adding a site with zero items, unlike contract creation', async () => {
    const contracts = new InMemoryContractRepository();
    const sites = new InMemoryContractSiteRepository();
    const items = new InMemoryContractItemRepository();
    const contract = await createBaseContract(contracts, sites, items);

    const useCase = new AddContractSiteUseCase(contracts, sites, items);
    const { site } = await useCase.execute({
      tenantId: 1,
      contractId: contract.id as number,
      name: 'Warehouse',
      workRequirements: null,
      notes: null,
      latitude: null,
      longitude: null,
      radiusMeters: 200,
      items: [],
    });
    expect(site.items).toHaveLength(0);
  });

  it('still validates each item when items are provided', async () => {
    const contracts = new InMemoryContractRepository();
    const sites = new InMemoryContractSiteRepository();
    const items = new InMemoryContractItemRepository();
    const contract = await createBaseContract(contracts, sites, items);

    const useCase = new AddContractSiteUseCase(contracts, sites, items);
    await expect(
      useCase.execute({
        tenantId: 1,
        contractId: contract.id as number,
        name: 'Warehouse',
        workRequirements: null,
        notes: null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
        items: [
          {
            name: 'Bad item',
            frequencyCount: 0,
            frequencyUnit: FrequencyUnit.Week,
            frequencyRule: null,
            dayOfWeek: null,
            dayOfMonth: null,
            unitPrice: 100,
          },
        ],
      }),
    ).rejects.toThrow(ValidationFailedError);
  });
});
