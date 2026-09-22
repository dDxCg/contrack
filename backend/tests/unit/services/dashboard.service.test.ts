import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { FakeClock } from '../../support/clock';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { ContractCost, CostCategory } from '../../../models/contract-costs/contract-cost.entity';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { Statement, StatementStatus } from '../../../models/statements/statement.entity';
import { ContractCostRepository } from '../../../repositories/contract-costs/contract-cost.repository';
import { ContractRepository } from '../../../repositories/contracts/contract.repository';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { StatementRepository } from '../../../repositories/statements/statement.repository';
import { TenantRepository } from '../../../repositories/tenants/tenant.repository';
import { CostEstimationService } from '../../../services/contract-costs/cost-estimation.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { Money } from '../../../utils/money';

function draftEmployee(overrides: Partial<Employee>): Employee {
  const employee = new Employee();
  employee.setName('Kế toán');
  employee.setContact(null);
  employee.email = `${Math.random()}@example.com`;
  employee.setRole(Role.Accountant);
  employee.setTeam(null);
  employee.setManager(null);
  employee.status = EmployeeStatus.Active;
  employee.setPasswordHash('x');
  Object.assign(employee, overrides);

  return employee;
}

async function world(now = new Date('2024-10-15T00:00:00.000Z')) {
  const dataSource = await createTestDataSource();
  const contracts = new ContractRepository(dataSource);
  const shifts = new ShiftRepository(dataSource);
  const statements = new StatementRepository(dataSource);
  const tenants = new TenantRepository(dataSource);
  const costs = new ContractCostRepository(dataSource);
  const employees = new EmployeeRepository(dataSource);
  const clock = new FakeClock(now);
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id, { unitPrice: 1000000 });
  const director = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Director });
  const accountant = await employees.create(draftEmployee({ tenantId: tenant.id }));

  return {
    dataSource,
    contracts,
    shifts,
    statements,
    tenants,
    costs,
    tenant,
    chain,
    accountant,
    access: anAccessContext(director, { tenantId: tenant.id }),
    service: new DashboardService(
      contracts,
      shifts,
      statements,
      tenants,
      costs,
      new CostEstimationService(costs, shifts),
      clock,
    ),
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
    statement.totalAmount = Money.fromNumber(1000000);
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
describe('DashboardService.get — shifts_by_site', () => {
  it('breaks shift stats down per site, worst completed_pct first', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    const goodChain = await seedContractItemChain(dataSource, tenant.id, { unitPrice: 500000 });
    await dataSource.query('UPDATE contract_sites SET name = $1 WHERE id = $2', ['Toà A', chain.siteId]);
    await dataSource.query('UPDATE contract_sites SET name = $1 WHERE id = $2', ['Toà B', goodChain.siteId]);
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: goodChain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const summary = await service.get(access, {});
    expect(summary.shifts_by_site).toHaveLength(2);
    expect(summary.shifts_by_site[0]).toMatchObject({ site_name: 'Toà A', completed_pct: 0 });
    expect(summary.shifts_by_site[1]).toMatchObject({ site_name: 'Toà B', completed_pct: 100 });
  });
  it('sorts sites with no due shifts yet to the end', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-01T00:00:00.000Z'));
    const otherChain = await seedContractItemChain(dataSource, tenant.id, { unitPrice: 500000 });
    await dataSource.query('UPDATE contract_sites SET name = $1 WHERE id = $2', [
      'Chưa đến hạn',
      chain.siteId,
    ]);
    await dataSource.query('UPDATE contract_sites SET name = $1 WHERE id = $2', [
      'Đã trễ',
      otherChain.siteId,
    ]);
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-20',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: otherChain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-01',
    });
    const summary = await service.get(access, {});
    expect(summary.shifts_by_site.map((s) => s.site_name)).toEqual(['Đã trễ', 'Chưa đến hạn']);
  });
});
describe('DashboardService.get — new_contracts_trend', () => {
  it('counts contracts by signed_at across the 6 trailing months, ending at the filtered month', async () => {
    const { service, access, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await seedContractItemChain(dataSource, tenant.id, { signedAt: '2024-09-10' });
    await seedContractItemChain(dataSource, tenant.id, { signedAt: '2024-09-20' });
    await seedContractItemChain(dataSource, tenant.id, { signedAt: '2024-10-05' });
    const summary = await service.get(access, {});
    expect(summary.new_contracts_trend).toHaveLength(6);
    expect(summary.new_contracts_trend[0]).toMatchObject({ period_start: '2024-05-01', count: 0 });
    expect(summary.new_contracts_trend[4]).toMatchObject({ period_start: '2024-09-01', count: 2 });
    expect(summary.new_contracts_trend[5]).toMatchObject({ period_start: '2024-10-01', count: 1 });
  });
});
describe('DashboardService.get — renewal_rate_pct / cancellation_rate_pct', () => {
  it('computes both rates over the same renewed+expired+cancelled cohort, expiring in the trailing 12 months', async () => {
    const { service, access, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    const renewed = await seedContractItemChain(dataSource, tenant.id, { expiresAt: '2024-06-01' });
    const cancelled = await seedContractItemChain(dataSource, tenant.id, { expiresAt: '2024-07-01' });
    const expired1 = await seedContractItemChain(dataSource, tenant.id, { expiresAt: '2024-08-01' });
    const expired2 = await seedContractItemChain(dataSource, tenant.id, { expiresAt: '2024-09-01' });
    await dataSource.query(
      `UPDATE contracts SET status_id = (SELECT id FROM contract_statuses WHERE code = 'renewed') WHERE id = $1`,
      [renewed.contractId],
    );
    await dataSource.query(
      `UPDATE contracts SET status_id = (SELECT id FROM contract_statuses WHERE code = 'cancelled') WHERE id = $1`,
      [cancelled.contractId],
    );
    await dataSource.query(
      `UPDATE contracts SET status_id = (SELECT id FROM contract_statuses WHERE code = 'expired') WHERE id IN ($1, $2)`,
      [expired1.contractId, expired2.contractId],
    );
    const summary = await service.get(access, {});
    expect(summary.renewal_rate_pct).toBe(25);
    expect(summary.cancellation_rate_pct).toBe(25);
  });
  it('reports 0 rather than dividing by zero when no contract expired in the cohort window', async () => {
    const { service, access } = await world(new Date('2024-10-15T00:00:00.000Z'));
    const summary = await service.get(access, {});
    expect(summary.renewal_rate_pct).toBe(0);
    expect(summary.cancellation_rate_pct).toBe(0);
  });
});
describe('DashboardService.get — profit_trend', () => {
  it('uses the recorded cost for a bucket that has one, flagging it as not estimated', async () => {
    const { service, access, chain, tenant, dataSource, costs, accountant } = await world(
      new Date('2024-10-15T00:00:00.000Z'),
    );
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
    });
    const cost = new ContractCost();
    cost.tenantId = tenant.id;
    cost.contractId = chain.contractId;
    cost.category = CostCategory.Labor;
    cost.period = new Date('2024-10-01');
    cost.amount = Money.fromNumber(400000);
    cost.createdBy = accountant.id;
    await costs.upsert(cost);
    const summary = await service.get(access, {});
    expect(summary.profit_trend).toHaveLength(6);
    expect(summary.profit_trend[5]).toEqual({
      period_start: '2024-10-01',
      period_end: '2024-10-31',
      label: 'T10',
      revenue: 1000000,
      cost: 400000,
      profit: 600000,
      margin_pct: 60,
      is_estimated: false,
    });
  });
  it('estimates cost for a bucket with no recorded figure, flagging it', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-09-03',
    });
    const summary = await service.get(access, {});
    const septemberBucket = summary.profit_trend[4];
    expect(septemberBucket).toMatchObject({
      period_start: '2024-09-01',
      revenue: 1000000,
      cost: 0,
      is_estimated: true,
    });
  });
  it('reports a zero, non-estimated bucket for a month with no shifts at all', async () => {
    const { service, access } = await world(new Date('2024-10-15T00:00:00.000Z'));
    const summary = await service.get(access, {});
    expect(summary.profit_trend[0]).toEqual({
      period_start: '2024-05-01',
      period_end: '2024-05-31',
      label: 'T5',
      revenue: 0,
      cost: 0,
      profit: 0,
      margin_pct: 0,
      is_estimated: false,
    });
  });
});
describe('DashboardService.get — comparison', () => {
  it('compares the filtered month against the previous calendar month', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-09-10',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-09-20',
      status: 'completed',
    });
    await seedContractItemChain(dataSource, tenant.id, { unitPrice: 200000, signedAt: '2024-09-05' });
    const summary = await service.get(access, {});
    expect(summary.comparison).toMatchObject({
      period_start: '2024-09-01',
      period_end: '2024-09-30',
      projected_revenue: 2000000,
      late_shifts: 1,
      new_contracts: 1,
    });
  });
  it('compares a custom range against the equally-long window right before it', async () => {
    const { service, access, chain, tenant, dataSource } = await world(new Date('2024-10-15T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-09',
    });
    const summary = await service.get(access, { from: '2024-10-10', to: '2024-10-16' });
    expect(summary.comparison).toMatchObject({ period_start: '2024-10-03', period_end: '2024-10-09' });
  });
});
