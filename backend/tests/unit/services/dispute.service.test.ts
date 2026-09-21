import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { FakeClock } from '../../support/clock';
import { Role } from '../../../models/employees/employee.entity';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { DisputeService } from '../../../services/shifts/dispute.service';
async function world() {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);
  const shiftId = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: null,
    scheduledDate: '2024-10-21',
  });
  const manager = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Manager });
  const clock = new FakeClock(new Date('2024-10-22T09:00:00.000Z'));
  return {
    shifts,
    tenant,
    shiftId,
    clock,
    access: anAccessContext(manager, { tenantId: tenant.id }),
    service: new DisputeService(shifts, clock),
  };
}
describe('DisputeService.mark — FR8', () => {
  it('marks a shift disputed, excluding it from the next statement (D6)', async () => {
    const { service, access, shiftId, shifts, tenant } = await world();
    const view = await service.mark(access, shiftId, { reason: 'Không thấy nhân viên đến' });
    expect(view.status).toBe('disputed');
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.status).toBe('disputed');
  });
  it('rejects disputing an already-disputed shift', async () => {
    const { service, access, shiftId } = await world();
    await service.mark(access, shiftId, { reason: 'Không thấy nhân viên đến' });
    const error = await captureDomainErrorAsync(() => service.mark(access, shiftId, { reason: 'Lại nữa' }));
    expect(error.code).toBe('shift.already_disputed');
  });
  it('answers 404 auth.out_of_scope for a shift outside the tenant', async () => {
    const { service, access } = await world();
    const error = await captureDomainErrorAsync(() => service.mark(access, 999999, { reason: 'x' }));
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('persists the reason and reporter details given on the request, and returns them on the view', async () => {
    const { service, access, shiftId, shifts, tenant } = await world();
    const view = await service.mark(access, shiftId, {
      reason: 'Không thấy nhân viên đến',
      reportedVia: 'phone',
      reportedBy: 'Chị Lan, quản lý toà nhà',
      reportedAt: new Date('2024-10-22T08:00:00.000Z'),
      description: 'Gọi 3 lần không ai bắt máy',
    });
    expect(view.dispute_reason).toBe('Không thấy nhân viên đến');
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.disputeReason).toBe('Không thấy nhân viên đến');
    expect(reloaded?.disputeReportedVia).toBe('phone');
    expect(reloaded?.disputeReportedBy).toBe('Chị Lan, quản lý toà nhà');
    expect(reloaded?.disputeReportedAt).toEqual(new Date('2024-10-22T08:00:00.000Z'));
    expect(reloaded?.disputeDescription).toBe('Gọi 3 lần không ai bắt máy');
  });
  it('defaults reported_at to server time when the caller omits it', async () => {
    const { service, access, shiftId, shifts, tenant, clock } = await world();
    await service.mark(access, shiftId, { reason: 'Không thấy nhân viên đến' });
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.disputeReportedAt).toEqual(clock.now());
  });
  it('rejects a TeamLead — dispute is manager/director-only per 05-api.yaml', async () => {
    const { service, shiftId, tenant } = await world();
    const teamLead = anEmployee({ id: 13, tenantId: tenant.id, role: Role.TeamLead });
    const access = anAccessContext(teamLead, { tenantId: tenant.id });
    const error = await captureDomainErrorAsync(() =>
      service.mark(access, shiftId, { reason: 'Không thấy nhân viên đến' }),
    );
    expect(error.code).toBe('auth.forbidden_role');
  });
});
describe('DisputeService.resolve', () => {
  it('returns a disputed shift to completed', async () => {
    const { service, access, shiftId, shifts, tenant } = await world();
    await service.mark(access, shiftId, { reason: 'Không thấy nhân viên đến' });
    const view = await service.resolve(access, shiftId);
    expect(view.status).toBe('completed');
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.status).toBe('completed');
  });
  it('rejects resolving a shift that is not disputed', async () => {
    const { service, access, shiftId } = await world();
    const error = await captureDomainErrorAsync(() => service.resolve(access, shiftId));
    expect(error.code).toBe('shift.not_disputed');
  });
  it('rejects a TeamLead — resolve is manager/director-only per 05-api.yaml', async () => {
    const { service, access, shiftId, tenant } = await world();
    await service.mark(access, shiftId, { reason: 'Không thấy nhân viên đến' });
    const teamLead = anEmployee({ id: 13, tenantId: tenant.id, role: Role.TeamLead });
    const teamLeadAccess = anAccessContext(teamLead, { tenantId: tenant.id });
    const error = await captureDomainErrorAsync(() => service.resolve(teamLeadAccess, shiftId));
    expect(error.code).toBe('auth.forbidden_role');
  });
});
