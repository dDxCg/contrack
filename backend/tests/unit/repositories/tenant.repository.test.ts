import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { TenantStatus } from '../../../models/tenants/tenant.entity';
import { TenantRepository } from '../../../repositories/tenants/tenant.repository';

describe('TenantRepository.activeIds', () => {
  it('lists every active tenant, ordered by id — the scheduler iterates exactly this', async () => {
    const dataSource = await createTestDataSource();
    const first = await seedTenant(dataSource, { name: 'First Co' });
    const second = await seedTenant(dataSource, { name: 'Second Co' });
    const repository = new TenantRepository(dataSource);
    expect(await repository.activeIds()).toEqual([first.id, second.id]);
  });
  it('never lists a suspended tenant — the alert fan-out must skip them', async () => {
    const dataSource = await createTestDataSource();
    const active = await seedTenant(dataSource, { name: 'Active Co' });
    await seedTenant(dataSource, { name: 'Suspended Co', status: TenantStatus.Suspended });
    const repository = new TenantRepository(dataSource);
    expect(await repository.activeIds()).toEqual([active.id]);
  });
});
describe('TenantRepository — timezone (D11)', () => {
  it('defaults a new tenant to Asia/Ho_Chi_Minh and hydrates it back on findById', async () => {
    const dataSource = await createTestDataSource();
    const repository = new TenantRepository(dataSource);
    const created = await repository.create('New Co');
    expect(created.timezone).toBe('Asia/Ho_Chi_Minh');
    expect((await repository.findById(created.id))?.timezone).toBe('Asia/Ho_Chi_Minh');
  });
  it('timezoneOf reads a tenant-specific override', async () => {
    const dataSource = await createTestDataSource();
    const tenant = await seedTenant(dataSource, { timezone: 'UTC' });
    const repository = new TenantRepository(dataSource);
    expect(await repository.timezoneOf(tenant.id)).toBe('UTC');
  });
  it('timezoneOf falls back to Asia/Ho_Chi_Minh for an unknown tenant id', async () => {
    const dataSource = await createTestDataSource();
    const repository = new TenantRepository(dataSource);
    expect(await repository.timezoneOf(999999)).toBe('Asia/Ho_Chi_Minh');
  });
});
