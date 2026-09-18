import { anAccessContext } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { RowScope } from '../../../services/access-control/row-scope';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { DispatchService } from '../../../services/shifts/dispatch.service';

function draftEmployee(overrides: Partial<Employee>): Employee {
  const employee = new Employee();
  employee.setName('Lê Thị Mai');
  employee.setContact(null);
  employee.email = `${Math.random()}@example.com`;
  employee.setRole(Role.Employee);
  employee.setTeam(null);
  employee.setManager(null);
  employee.status = EmployeeStatus.Active;
  employee.setPasswordHash('x');
  Object.assign(employee, overrides);

  return employee;
}

async function world() {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
  const employees = new EmployeeRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);

  const [teamA] = (await dataSource.query(
    `INSERT INTO teams (tenant_id, name, code) VALUES ($1, 'Team A', 'TA') RETURNING id`,
    [tenant.id],
  )) as { id: number }[];
  const [teamB] = (await dataSource.query(
    `INSERT INTO teams (tenant_id, name, code) VALUES ($1, 'Team B', 'TB') RETURNING id`,
    [tenant.id],
  )) as { id: number }[];

  const lead = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'lead@example.com', role: Role.TeamLead, teamId: teamA.id }),
  );
  const memberOfTeamA = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'member.a@example.com', teamId: teamA.id }),
  );
  const memberOfTeamB = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'member.b@example.com', teamId: teamB.id }),
  );

  const shiftId = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: memberOfTeamA.id,
    scheduledDate: '2024-10-21',
  });

  return {
    shifts,
    tenant,
    lead,
    memberOfTeamA,
    memberOfTeamB,
    shiftId,
    access: anAccessContext(lead, { tenantId: tenant.id, scope: RowScope.Team }),
    service: new DispatchService(shifts, employees),
  };
}

describe('DispatchService.reassign — FR15', () => {
  it('reassigns to another member of the team lead’s own team', async () => {
    const { service, access, memberOfTeamA, shiftId, shifts, tenant } = await world();

    await service.reassign(access, shiftId, { assigneeId: memberOfTeamA.id });

    const shift = await shifts.findById(tenant.id, shiftId);
    expect(shift?.assigneeId).toBe(memberOfTeamA.id);
  });

  it('rejects reassigning to an employee outside the team lead’s team', async () => {
    const { service, access, memberOfTeamB, shiftId } = await world();

    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, shiftId, { assigneeId: memberOfTeamB.id }),
    );

    expect(error.code).toBe('shift.assignee_out_of_team');
  });

  it('reschedules the shift date', async () => {
    const { service, access, memberOfTeamA, shiftId, shifts, tenant } = await world();

    const view = await service.reassign(access, shiftId, {
      assigneeId: memberOfTeamA.id,
      scheduledDate: new Date('2024-10-25'),
    });

    expect(view.scheduled_date).toBeTruthy();
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.scheduledDate).toEqual(new Date('2024-10-25'));
  });

  it('unassigns when given a null assignee', async () => {
    const { service, access, shiftId, shifts, tenant } = await world();

    await service.reassign(access, shiftId, { assigneeId: null });

    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.assigneeId).toBeNull();
  });

  it('answers 404 auth.out_of_scope for a shift outside the tenant', async () => {
    const { service, access, memberOfTeamA } = await world();

    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, 999_999, { assigneeId: memberOfTeamA.id }),
    );

    expect(error.code).toBe('auth.out_of_scope');
  });

  it('rejects reassigning a completed shift', async () => {
    const { service, access, memberOfTeamA, shiftId, shifts, tenant } = await world();
    const completing = await shifts.findById(tenant.id, shiftId);
    completing!.complete({ receiptPhotoUrl: 'x', latitude: null, longitude: null }, new Date());
    await shifts.update(completing!);

    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, shiftId, { assigneeId: memberOfTeamA.id }),
    );

    expect(error.code).toBe('shift.already_completed');
  });
});
