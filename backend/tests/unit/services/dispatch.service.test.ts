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
  )) as {
    id: number;
  }[];
  const [teamB] = (await dataSource.query(
    `INSERT INTO teams (tenant_id, name, code) VALUES ($1, 'Team B', 'TB') RETURNING id`,
    [tenant.id],
  )) as {
    id: number;
  }[];
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
    teamId: teamA.id,
  });

  return {
    dataSource,
    shifts,
    employees,
    tenant,
    lead,
    teamA,
    teamB,
    itemId: chain.itemId,
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
      service.reassign(access, 999999, { assigneeId: memberOfTeamA.id }),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('rejects reassigning a completed shift', async () => {
    const { service, access, memberOfTeamA, shiftId, shifts, tenant } = await world();
    const completing = await shifts.findById(tenant.id, shiftId);
    completing!.complete(
      { receiptPhotoUrl: 'x', latitude: null, longitude: null, geoVerified: false },
      new Date(),
    );
    await shifts.update(completing!);
    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, shiftId, { assigneeId: memberOfTeamA.id }),
    );
    expect(error.code).toBe('shift.already_completed');
  });
  it('rejects a Manager — reassign is team_lead-only per 05-api.yaml', async () => {
    const { service, memberOfTeamA, shiftId, tenant } = await world();
    const manager = draftEmployee({ tenantId: tenant.id, email: 'manager@example.com', role: Role.Manager });
    const access = anAccessContext(manager, { tenantId: tenant.id, scope: RowScope.All });
    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, shiftId, { assigneeId: memberOfTeamA.id }),
    );
    expect(error.code).toBe('auth.forbidden_role');
  });
  it('rejects a Director — reassign is team_lead-only per 05-api.yaml', async () => {
    const { service, memberOfTeamA, shiftId, tenant } = await world();
    const director = draftEmployee({
      tenantId: tenant.id,
      email: 'director@example.com',
      role: Role.Director,
    });
    const access = anAccessContext(director, { tenantId: tenant.id, scope: RowScope.All });
    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, shiftId, { assigneeId: memberOfTeamA.id }),
    );
    expect(error.code).toBe('auth.forbidden_role');
  });
  it('rejects a team lead reassigning a shift not assigned to their team', async () => {
    const { service, access, memberOfTeamA, dataSource, tenant, itemId, teamB } = await world();
    const otherShiftId = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: itemId,
      assigneeId: null,
      scheduledDate: '2024-10-21',
      teamId: teamB.id,
    });
    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, otherShiftId, { assigneeId: memberOfTeamA.id }),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('rejects a team lead reassigning a shift no manager has assigned to any team yet', async () => {
    const { service, access, memberOfTeamA, dataSource, tenant, itemId } = await world();
    const unassignedTeamShiftId = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: itemId,
      assigneeId: null,
      scheduledDate: '2024-10-21',
    });
    const error = await captureDomainErrorAsync(() =>
      service.reassign(access, unassignedTeamShiftId, { assigneeId: memberOfTeamA.id }),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
});
describe('DispatchService.assignTeam', () => {
  it('lets a Manager assign a shift to a team', async () => {
    const { service, shifts, tenant, shiftId, teamB } = await world();
    const manager = draftEmployee({ tenantId: tenant.id, email: 'manager@example.com', role: Role.Manager });
    const access = anAccessContext(manager, { tenantId: tenant.id, scope: RowScope.All });
    await service.assignTeam(access, shiftId, teamB.id);
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.teamId).toBe(teamB.id);
  });
  it('lets a Director assign a shift to a team', async () => {
    const { service, shifts, tenant, shiftId, teamB } = await world();
    const director = draftEmployee({
      tenantId: tenant.id,
      email: 'director@example.com',
      role: Role.Director,
    });
    const access = anAccessContext(director, { tenantId: tenant.id, scope: RowScope.All });
    await service.assignTeam(access, shiftId, teamB.id);
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.teamId).toBe(teamB.id);
  });
  it('rejects a TeamLead assigning a team — assignTeam is manager/director-only', async () => {
    const { service, access, shiftId, teamB } = await world();
    const error = await captureDomainErrorAsync(() => service.assignTeam(access, shiftId, teamB.id));
    expect(error.code).toBe('auth.forbidden_role');
  });
});
