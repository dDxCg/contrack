import { QueryFailedError } from 'typeorm';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { Team } from '../../../models/teams/team.entity';
import { TeamRepository } from '../../../repositories/teams/team.repository';
import { withUniqueViolation } from '../../../repositories/unique-violation';

class MarkerException extends Error {}

describe('withUniqueViolation', () => {
  it('returns the operation result untouched on success', async () => {
    const result = await withUniqueViolation(
      () => Promise.resolve('ok'),
      () => new MarkerException(),
    );

    expect(result).toBe('ok');
  });

  it('converts a real 23505 from a duplicate insert into the given exception', async () => {
    const dataSource = await createTestDataSource();
    const tenant = await seedTenant(dataSource);
    const repository = new TeamRepository(dataSource);
    const first = new Team();
    first.tenantId = tenant.id;
    first.setName('A');
    first.setCode('T1');
    await repository.create(first);

    const second = new Team();
    second.tenantId = tenant.id;
    second.setName('B');
    second.setCode('T1');

    await expect(
      withUniqueViolation(
        () => repository.create(second),
        () => new MarkerException(),
      ),
    ).rejects.toBeInstanceOf(MarkerException);
  });

  it('rethrows an unrelated QueryFailedError untouched', async () => {
    const notAUniqueViolation = new QueryFailedError('select 1', [], new Error('syntax error') as never);
    (notAUniqueViolation as unknown as { driverError: { code: string } }).driverError = { code: '42601' };

    await expect(
      withUniqueViolation(
        () => Promise.reject(notAUniqueViolation),
        () => new MarkerException(),
      ),
    ).rejects.toBe(notAUniqueViolation);
  });

  it('rethrows a non-database error untouched', async () => {
    const boom = new Error('boom');

    await expect(
      withUniqueViolation(
        () => Promise.reject(boom),
        () => new MarkerException(),
      ),
    ).rejects.toBe(boom);
  });
});
