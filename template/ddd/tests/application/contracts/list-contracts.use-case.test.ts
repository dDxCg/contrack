import { CreateContractUseCase } from '../../../src/contexts/contracts/application/use-cases/create-contract.use-case';
import { ListContractsUseCase } from '../../../src/contexts/contracts/application/use-cases/list-contracts.use-case';
import { FrequencyUnit } from '../../../src/contexts/contracts/domain/value-objects/frequency-unit';
import { InMemoryContractRepository } from '../../support/in-memory-contract.repository';

function aCreateInput(tenantId: number, customerId: number) {
  return {
    tenantId,
    customerId,
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
            name: 'Mow lawn',
            frequencyCount: 1,
            frequencyUnit: FrequencyUnit.Week,
            frequencyRule: null,
            dayOfWeek: 1,
            dayOfMonth: null,
            unitPrice: 100,
          },
        ],
      },
    ],
  };
}

describe('ListContractsUseCase', () => {
  it('only returns contracts belonging to the requested tenant', async () => {
    const repository = new InMemoryContractRepository();
    const createContract = new CreateContractUseCase(repository);
    await createContract.execute(aCreateInput(1, 100));
    await createContract.execute(aCreateInput(1, 200));
    await createContract.execute(aCreateInput(2, 300));

    const listContracts = new ListContractsUseCase(repository);
    const tenantOnePage = await listContracts.execute(1, { limit: 20, offset: 0 });
    const tenantTwoPage = await listContracts.execute(2, { limit: 20, offset: 0 });

    expect(tenantOnePage.total).toBe(2);
    expect(tenantOnePage.items.map((c) => c.customerId).sort()).toEqual([100, 200]);
    expect(tenantTwoPage.total).toBe(1);
    expect(tenantTwoPage.items.map((c) => c.customerId)).toEqual([300]);
  });

  it('respects limit/offset pagination', async () => {
    const repository = new InMemoryContractRepository();
    const createContract = new CreateContractUseCase(repository);
    await createContract.execute(aCreateInput(1, 1));
    await createContract.execute(aCreateInput(1, 2));
    await createContract.execute(aCreateInput(1, 3));

    const listContracts = new ListContractsUseCase(repository);
    const page = await listContracts.execute(1, { limit: 1, offset: 1 });

    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].customerId).toBe(2);
  });
});
