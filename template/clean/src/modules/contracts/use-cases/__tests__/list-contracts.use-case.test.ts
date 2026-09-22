import { CreateContractUseCase } from '../create-contract.use-case';
import { ListContractsUseCase } from '../list-contracts.use-case';
import { FrequencyUnit } from '../../entities/contract-item';
import {
  InMemoryContractItemRepository,
  InMemoryContractRepository,
  InMemoryContractSiteRepository,
} from './fakes';

function aSite() {
  return {
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
  };
}

describe('ListContractsUseCase', () => {
  it('only returns contracts belonging to the requesting tenant', async () => {
    const repository = new InMemoryContractRepository();
    const createContract = new CreateContractUseCase(
      repository,
      new InMemoryContractSiteRepository(),
      new InMemoryContractItemRepository(),
    );
    await createContract.execute({
      tenantId: 1,
      customerId: 1,
      signedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
      sites: [aSite()],
    });
    await createContract.execute({
      tenantId: 2,
      customerId: 2,
      signedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
      sites: [aSite()],
    });

    const listContracts = new ListContractsUseCase(repository);
    const tenant1Result = await listContracts.execute({ tenantId: 1, page: { limit: 25, offset: 0 } });
    const tenant2Result = await listContracts.execute({ tenantId: 2, page: { limit: 25, offset: 0 } });

    expect(tenant1Result.items).toHaveLength(1);
    expect(tenant1Result.items[0].tenantId).toBe(1);
    expect(tenant2Result.items).toHaveLength(1);
    expect(tenant2Result.items[0].tenantId).toBe(2);
  });

  it('echoes the requested page bounds even on an empty result', async () => {
    const listContracts = new ListContractsUseCase(new InMemoryContractRepository());
    const result = await listContracts.execute({ tenantId: 99, page: { limit: 10, offset: 5 } });
    expect(result).toEqual({ items: [], total: 0, limit: 10, offset: 5 });
  });
});
