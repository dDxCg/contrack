import { CreateContractUseCase } from '../create-contract.use-case';
import { FrequencyUnit } from '../../entities/contract-item';
import { ValidationFailedError } from '../../entities/errors';
import {
  InMemoryContractItemRepository,
  InMemoryContractRepository,
  InMemoryContractSiteRepository,
} from './fakes';

function makeUseCase(): { useCase: CreateContractUseCase; contracts: InMemoryContractRepository } {
  const contracts = new InMemoryContractRepository();
  const sites = new InMemoryContractSiteRepository();
  const items = new InMemoryContractItemRepository();
  return { useCase: new CreateContractUseCase(contracts, sites, items), contracts };
}

function validItem() {
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

describe('CreateContractUseCase', () => {
  it('rejects a contract with zero sites', async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({
        tenantId: 1,
        customerId: 1,
        signedAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
        sites: [],
      }),
    ).rejects.toThrow(ValidationFailedError);
  });

  it('rejects a site with zero items', async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({
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
            items: [],
          },
        ],
      }),
    ).rejects.toThrow(ValidationFailedError);
  });

  it('creates and persists a valid contract with sites and items', async () => {
    const { useCase, contracts: repository } = makeUseCase();
    const { contract } = await useCase.execute({
      tenantId: 1,
      customerId: 42,
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
          items: [validItem()],
        },
      ],
    });
    expect(contract.id).toBeDefined();
    expect(contract.customerId).toBe(42);
    const found = await repository.findById(1, contract.id as number);
    expect(found).not.toBeNull();
  });
});
