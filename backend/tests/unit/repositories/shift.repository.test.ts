import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';

async function world() {
  const dataSource = await createTestDataSource();
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);
  const shifts = new ShiftRepository(dataSource);

  return { dataSource, tenant, chain, shifts };
}

describe('ShiftRepository.countsForTenantInRange', () => {
  it('returns per-date counts in one query, covering every date with at least one shift', async () => {
    const { dataSource, tenant, chain, shifts } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-01-10',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-01-10',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-01-12',
    });

    const counts = await shifts.countsForTenantInRange(tenant.id, '2024-01-01', '2024-01-31');

    expect(counts.get('2024-01-10')).toBe(2);
    expect(counts.get('2024-01-12')).toBe(1);
    expect(counts.has('2024-01-11')).toBe(false);
  });

  it('returns an empty map when nothing is scheduled in the range', async () => {
    const { tenant, shifts } = await world();

    const counts = await shifts.countsForTenantInRange(tenant.id, '2024-01-01', '2024-01-31');

    expect(counts.size).toBe(0);
  });
});
