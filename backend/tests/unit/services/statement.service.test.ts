import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Role } from '../../../models/employees/employee.entity';
import { ContractRepository } from '../../../repositories/contracts/contract.repository';
import { StatementRepository } from '../../../repositories/statements/statement.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { TenantRepository } from '../../../repositories/tenants/tenant.repository';
import { StatementService } from '../../../services/statements/statement.service';
async function world() {
  const dataSource = await createTestDataSource();
  const statements = new StatementRepository(dataSource);
  const shifts = new ShiftRepository(dataSource);
  const contracts = new ContractRepository(dataSource);
  const tenants = new TenantRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id, { unitPrice: 500000 });
  const accountant = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Accountant });
  return {
    dataSource,
    statements,
    shifts,
    contracts,
    tenants,
    tenant,
    chain,
    access: anAccessContext(accountant, { tenantId: tenant.id }),
    service: new StatementService(statements, shifts, contracts, tenants),
  };
}
describe('StatementService.compute — FR10, D6', () => {
  it('sums completed shifts × item unit_price for the period', async () => {
    const { service, access, chain, tenant, dataSource } = await world();
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
      scheduledDate: '2024-10-10',
      status: 'completed',
    });
    const view = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2024-10-01'),
    });
    expect(view.total_amount).toBe(1000000);
    expect(view.status).toBe('draft');
    expect(view.lines).toHaveLength(2);
    expect(view.lines.every((line) => line.has_evidence)).toBe(true);
  });
  it('normalizes a mid-month period to the start of the month (D11) — still covers the whole month', async () => {
    const { service, access, chain, tenant, dataSource, statements } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const view = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2024-10-15'),
    });
    expect(view.total_amount).toBe(500000);
    const stored = await statements.findByContractPeriod(tenant.id, chain.contractId, '2024-10-01');
    expect(stored?.id).toBe(view.id);
  });
  it('resolves the period through the tenant timezone, not UTC (M5) — a late-month UTC instant is already next month in Vietnam', async () => {
    const { service, access, chain, tenant, dataSource, statements } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2026-03-01',
      status: 'completed',
    });
    const view = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2026-02-28T18:00:00.000Z'),
    });
    expect(view.total_amount).toBe(500000);
    const stored = await statements.findByContractPeriod(tenant.id, chain.contractId, '2026-03-01');
    expect(stored?.id).toBe(view.id);
  });
  it('blocks on a shift missing evidence, naming it', async () => {
    const { service, access, chain, tenant, dataSource } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const scheduledShiftId = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-10',
    });
    const error = await captureDomainErrorAsync(() =>
      service.compute(access, { contractId: chain.contractId, period: new Date('2024-10-01') }),
    );
    expect(error.code).toBe('statement.period_incomplete');
    expect(error.details).toEqual({ shift_ids: [scheduledShiftId] });
  });
  it('blocks on a disputed shift', async () => {
    const { service, access, chain, tenant, dataSource } = await world();
    const disputedShiftId = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'disputed',
    });
    const error = await captureDomainErrorAsync(() =>
      service.compute(access, { contractId: chain.contractId, period: new Date('2024-10-01') }),
    );
    expect(error.code).toBe('statement.period_incomplete');
    expect(error.details).toEqual({ shift_ids: [disputedShiftId] });
  });
  it('rejects computing a statement that already exists for this contract and period', async () => {
    const { service, access, chain } = await world();
    const first = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2024-10-01'),
    });
    const error = await captureDomainErrorAsync(() =>
      service.compute(access, { contractId: chain.contractId, period: new Date('2024-10-01') }),
    );
    expect(error.code).toBe('statement.already_exists');
    expect(error.details).toEqual({ statement_id: first.id });
  });
  it('still answers 409 statement.already_exists when a race slips past the pre-check', async () => {
    const { service, access, chain, statements } = await world();
    await service.compute(access, { contractId: chain.contractId, period: new Date('2024-10-01') });
    jest.spyOn(statements, 'findByContractPeriod').mockResolvedValue(null);

    const error = await captureDomainErrorAsync(() =>
      service.compute(access, { contractId: chain.contractId, period: new Date('2024-10-01') }),
    );

    expect(error.code).toBe('statement.already_exists');
  });
});
describe('StatementService.get', () => {
  it('lists a later-disputed shift rather than silently omitting it (US-15)', async () => {
    const { service, access, chain, tenant, dataSource, shifts } = await world();
    const shiftId = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const created = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2024-10-01'),
    });
    const shift = await shifts.findById(tenant.id, shiftId);
    shift!.dispute();
    await shifts.update(shift!);
    const view = await service.get(access, created.id);
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]).toMatchObject({ shift_id: shiftId, has_evidence: false });
  });
});
describe('StatementService.export / send — FR11, FR12', () => {
  it('exports a draft, setting status to issued', async () => {
    const { service, access, chain, dataSource, tenant } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const created = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2024-10-01'),
    });
    await service.export(access, created.id);
    const reloaded = await service.get(access, created.id);
    expect(reloaded.status).toBe('issued');
  });
  it('rejects sending before export', async () => {
    const { service, access, chain, dataSource, tenant } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const created = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2024-10-01'),
    });
    const error = await captureDomainErrorAsync(() => service.send(access, created.id));
    expect(error.code).toBe('statement.not_issued');
  });
  it('sends an issued statement, then rejects a second send', async () => {
    const { service, access, chain, dataSource, tenant } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const created = await service.compute(access, {
      contractId: chain.contractId,
      period: new Date('2024-10-01'),
    });
    await service.export(access, created.id);
    const sent = await service.send(access, created.id);
    expect(sent.status).toBe('sent');
    const error = await captureDomainErrorAsync(() => service.send(access, created.id));
    expect(error.code).toBe('statement.not_issued');
  });
});
