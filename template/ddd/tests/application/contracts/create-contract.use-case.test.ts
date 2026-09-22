import { CreateContractUseCase } from '../../../src/contexts/contracts/application/use-cases/create-contract.use-case';
import { ContractRequiresSiteError, ContractSiteRequiresItemError } from '../../../src/contexts/contracts/domain/errors';
import { FrequencyUnit } from '../../../src/contexts/contracts/domain/value-objects/frequency-unit';
import { InMemoryContractRepository } from '../../support/in-memory-contract.repository';

function aSiteInput(items: ReturnType<typeof anItemInput>[] = [anItemInput()]) {
  return {
    name: 'HQ',
    workRequirements: null,
    notes: null,
    latitude: null,
    longitude: null,
    radiusMeters: 200,
    items,
  };
}

function anItemInput() {
  return {
    name: 'Mow lawn',
    frequencyCount: 1,
    frequencyUnit: FrequencyUnit.Week,
    frequencyRule: null,
    dayOfWeek: 1,
    dayOfMonth: null,
    unitPrice: 100,
  };
}

describe('CreateContractUseCase', () => {
  it('creates a contract with sites and items, assigning ids and returning a view', async () => {
    const useCase = new CreateContractUseCase(new InMemoryContractRepository());
    const view = await useCase.execute({
      tenantId: 1,
      customerId: 42,
      signedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
      sites: [aSiteInput()],
    });
    expect(view.id).toBe(1);
    expect(view.sites).toHaveLength(1);
    expect(view.sites[0].items).toHaveLength(1);
    expect(view.sites[0].items[0].unitPrice).toBe(100);
  });

  it('rejects a contract with zero sites', async () => {
    const useCase = new CreateContractUseCase(new InMemoryContractRepository());
    await expect(
      useCase.execute({
        tenantId: 1,
        customerId: 42,
        signedAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
        sites: [],
      }),
    ).rejects.toThrow(ContractRequiresSiteError);
  });

  it('rejects a contract whose site has zero items', async () => {
    const useCase = new CreateContractUseCase(new InMemoryContractRepository());
    await expect(
      useCase.execute({
        tenantId: 1,
        customerId: 42,
        signedAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
        sites: [aSiteInput([])],
      }),
    ).rejects.toThrow(ContractSiteRequiresItemError);
  });
});
