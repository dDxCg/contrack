import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Role } from '../../../Models/employee.entity';
import { ShiftRepository } from '../../../Repositories/shift.repository';
import { DisputeService } from '../../../Services/dispute.service';

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

  return {
    shifts,
    tenant,
    shiftId,
    access: anAccessContext(manager, { tenantId: tenant.id }),
    service: new DisputeService(shifts),
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

    const error = await captureDomainErrorAsync(() => service.mark(access, 999_999, { reason: 'x' }));

    expect(error.code).toBe('auth.out_of_scope');
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
});
