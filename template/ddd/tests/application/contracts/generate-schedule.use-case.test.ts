import { CreateContractUseCase } from '../../../src/contexts/contracts/application/use-cases/create-contract.use-case';
import { GenerateScheduleUseCase } from '../../../src/contexts/contracts/application/use-cases/generate-schedule.use-case';
import { ContractNotFoundError } from '../../../src/contexts/contracts/domain/errors';
import { FrequencyUnit } from '../../../src/contexts/contracts/domain/value-objects/frequency-unit';
import { InMemoryContractRepository } from '../../support/in-memory-contract.repository';

describe('GenerateScheduleUseCase', () => {
  it('computes scheduled dates per item from each item frequency', async () => {
    const repository = new InMemoryContractRepository();
    const created = await new CreateContractUseCase(repository).execute({
      tenantId: 1,
      customerId: 1,
      signedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-01-15'),
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
              name: 'Daily patrol',
              frequencyCount: 7,
              frequencyUnit: FrequencyUnit.Day,
              frequencyRule: null,
              dayOfWeek: null,
              dayOfMonth: null,
              unitPrice: 10,
            },
          ],
        },
      ],
    });

    const schedule = await new GenerateScheduleUseCase(repository).execute(1, created.id);

    expect(schedule).toHaveLength(1);
    expect(schedule[0].dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-01',
      '2026-01-08',
      '2026-01-15',
    ]);
  });

  it('throws ContractNotFoundError for a contract that does not belong to the tenant', async () => {
    const repository = new InMemoryContractRepository();
    await expect(new GenerateScheduleUseCase(repository).execute(1, 999)).rejects.toThrow(
      ContractNotFoundError,
    );
  });
});
