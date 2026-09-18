import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { FakeClock } from '../../support/clock';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Role } from '../../../models/employees/employee.entity';
import { Statement, StatementStatus } from '../../../models/statements/statement.entity';
import { ContractRepository } from '../../../repositories/contracts/contract.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { StatementRepository } from '../../../repositories/statements/statement.repository';
import { TenantRepository } from '../../../repositories/tenants/tenant.repository';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
async function world(now = new Date('2024-10-15T00:00:00.000Z')) {
  const dataSource = await createTestDataSource();
  const contracts = new ContractRepository(dataSource);
  const shifts = new ShiftRepository(dataSource);
  const statements = new StatementRepository(dataSource);
  const tenants = new TenantRepository(dataSource);
  const clock = new FakeClock(now);
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id, { unitPrice: 1000000 });
  const director = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Director });
  return {
    dataSource,
    contracts,
    shifts,
    statements,
    tenants,
    tenant,
    chain,
    access: anAccessContext(director, { tenantId: tenant.id }),
    service: new DashboardService(contracts, shifts, statements, tenants, clock),
  };
}
describe('DashboardService.get — FR2', () => {
  it('counts active contracts, expiring-soon contracts and disputed shifts as of now', async () => {
    const { service, access, chain, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
      '2024-11-01',
      chain.contractId,
    ]);
    const summary = await service.get(access, {});
    expect(summary.active_contracts).toBe(1);
    expect(summary.expiring_soon).toBe(1);
    expect(summary.disputed_shifts).toBe(0);
  });
  it('sums projected revenue for every shift scheduled in the period, regardless of status', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-20',
    });
    const summary = await service.get(access, {});
    expect(summary.projected_revenue).toBe(2000000);
  });
  it('buckets shifts_summary into completed/overdue/disputed/not_due for the period', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-05',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-08',
      status: 'disputed',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-20',
    });
    const summary = await service.get(access, {});
    expect(summary.shifts_summary).toEqual({
      scheduled: 4,
      due: 3,
      not_due: 1,
      completed: 1,
      completed_pct: 33.33,
      overdue: 1,
      overdue_pct: 33.33,
      disputed: 1,
      disputed_pct: 33.33,
      missing_evidence: 0,
    });
  });
  it('reports null percentages rather than dividing by zero when nothing is due yet', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-01T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-20',
    });
    const summary = await service.get(access, {});
    expect(summary.shifts_summary).toMatchObject({
      due: 0,
      completed_pct: null,
      overdue_pct: null,
      disputed_pct: null,
    });
  });
  it('counts a period’s statements closed vs. the contracts that needed one', async () => {
    const { service, access, chain, tenant, dataSource, statements } = await world(
      new Date('2024-10-15T00:00:00.000Z'),
    );
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const statement = new Statement();
    statement.tenantId = tenant.id;
    statement.contractId = chain.contractId;
    statement.period = new Date('2024-10-01');
    statement.totalAmount = 1000000;
    statement.pdfUrl = null;
    statement.status = StatementStatus.Sent;
    await statements.create(statement);
    const summary = await service.get(access, {});
    expect(summary.statements_closed).toEqual({ closed: 1, total: 1 });
  });
  it('defaults to the current calendar month, bucketed by month', async () => {
    const { service, access } = await world(new Date('2024-10-15T00:00:00.000Z'));
    const summary = await service.get(access, {});
    expect(summary.bucket_unit).toBe('month');
  });
  it('resolves the default month through the tenant timezone — already March in Vietnam, still Feb in UTC (D11)', async () => {
    const { service, access, chain, dataSource, tenant } = await world(new Date('2026-02-28T18:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2026-03-01',
      status: 'completed',
    });
    const summary = await service.get(access, {});
    expect(summary.projected_revenue).toBe(1000000);
  });
  it('resolves an explicit month', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-07-10',
      status: 'completed',
    });
    const summary = await service.get(access, { month: '2024-07' });
    expect(summary.projected_revenue).toBe(1000000);
  });
  it('rejects month together with from/to', async () => {
    const { service, access } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.get(access, { month: '2024-10', from: '2024-10-01', to: '2024-10-31' }),
    );
    expect(error.code).toBe('dashboard.conflicting_period');
  });
});
