import { DataSource } from 'typeorm';
import { FakeClock } from '../../support/clock';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { TenantStatus } from '../../../models/tenants/tenant.entity';
import { TenantRepository } from '../../../repositories/tenants/tenant.repository';
import { PlatformDashboardService } from '../../../services/platform/platform-dashboard.service';

const NOW = new Date('2024-10-14T10:00:00.000Z');

async function world() {
  const dataSource = await createTestDataSource();
  const tenants = new TenantRepository(dataSource);
  const service = new PlatformDashboardService(tenants, new FakeClock(NOW));

  return { service, tenants, dataSource };
}

async function seedTenantAt(dataSource: DataSource, name: string, createdAt: Date): Promise<void> {
  await dataSource.query('INSERT INTO tenants (name, status_id, created_at) VALUES ($1, 1, $2)', [
    name,
    createdAt,
  ]);
}

describe('PlatformDashboardService.get — FR21', () => {
  it('counts tenants by status and lists recent ones, reading only from tenants', async () => {
    const { service, tenants } = await world();
    const active = await tenants.create('Active Co');
    const suspended = await tenants.create('Suspended Co');
    await tenants.updateStatus(suspended.id, TenantStatus.Suspended);
    const summary = await service.get();
    expect(summary.total_tenants).toBe(2);
    expect(summary.active_tenants).toBe(1);
    expect(summary.suspended_tenants).toBe(1);
    expect(summary.recent_tenants.map((t) => t.id).sort()).toEqual([active.id, suspended.id].sort());
  });
  it('buckets a 6-month growth trend ending on the current month', async () => {
    const { service } = await world();
    const summary = await service.get();
    expect(summary.growth_trend).toHaveLength(6);
    expect(summary.growth_trend[5]).toMatchObject({ period_start: '2024-10-01', label: 'T10' });
    expect(summary.tenants_created_this_period).toBe(summary.growth_trend[5].count);
  });
  it('counts a tenant created this month into the current bucket', async () => {
    const { service, dataSource } = await world();
    await seedTenantAt(dataSource, 'Fresh Co', NOW);
    const summary = await service.get();
    expect(summary.growth_trend[5].count).toBe(1);
  });
});
