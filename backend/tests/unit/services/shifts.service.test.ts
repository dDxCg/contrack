import { anAccessContext } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { ShiftStatus } from '../../../models/shifts/shift.entity';
import { RoleResolver } from '../../../services/access-control/role-resolver';
import { RowScope } from '../../../services/access-control/row-scope';
import { ScopeResolver } from '../../../services/access-control/scope-resolver';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { ShiftsService } from '../../../services/shifts/shifts.service';

function draftEmployee(overrides: Partial<Employee>): Employee {
  const employee = new Employee();
  employee.setName('Nhân viên');
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
  const director = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'director@example.com', role: Role.Director }),
  );
  const teamLeadA = await employees.create(
    draftEmployee({
      tenantId: tenant.id,
      email: 'lead.a@example.com',
      role: Role.TeamLead,
      teamId: teamA.id,
    }),
  );
  const memberA1 = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'a1@example.com', teamId: teamA.id }),
  );
  const memberA2 = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'a2@example.com', teamId: teamA.id }),
  );
  const memberB1 = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'b1@example.com', teamId: teamB.id }),
  );
  const shiftA1 = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: memberA1.id,
    scheduledDate: '2024-10-21',
    teamId: teamA.id,
  });
  const shiftA2 = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: memberA2.id,
    scheduledDate: '2024-10-22',
    status: 'completed',
    teamId: teamA.id,
  });
  const shiftB1 = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: memberB1.id,
    scheduledDate: '2024-10-21',
    teamId: teamB.id,
  });
  const shiftUnassigned = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: null,
    scheduledDate: '2024-10-21',
  });

  return {
    dataSource,
    itemId: chain.itemId,
    tenant,
    teamA,
    director,
    teamLeadA,
    memberA1,
    memberA2,
    memberB1,
    shiftA1,
    shiftA2,
    shiftB1,
    shiftUnassigned,
    service: new ShiftsService(shifts, new ScopeResolver(new RoleResolver())),
  };
}

const page = { limit: 25, offset: 0 };
describe('ShiftsService.list — row scope', () => {
  it('an All-scope caller (Director) sees every shift in the tenant', async () => {
    const { service, tenant, director } = await world();
    const result = await service.list(
      anAccessContext(director, { tenantId: tenant.id, scope: RowScope.All }),
      {},
      page,
    );
    expect(result.total).toBe(4);
  });
  it('a Team-scope caller (TeamLead) sees only their own team’s assigned shifts', async () => {
    const { service, tenant, teamLeadA, shiftA1, shiftA2 } = await world();
    const result = await service.list(
      anAccessContext(teamLeadA, { tenantId: tenant.id, scope: RowScope.Team }),
      {},
      page,
    );
    expect(result.total).toBe(2);
    expect(result.items.map((s) => s.id).sort()).toEqual([shiftA1, shiftA2].sort());
  });
  it('a Team-scope caller sees a shift a manager assigned to their team, even unassigned to anyone yet', async () => {
    const { dataSource, tenant, teamA, teamLeadA, itemId, service } = await world();
    const teamOnlyShiftId = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: itemId,
      assigneeId: null,
      scheduledDate: '2024-10-23',
      teamId: teamA.id,
    });
    const result = await service.list(
      anAccessContext(teamLeadA, { tenantId: tenant.id, scope: RowScope.Team }),
      {},
      page,
    );
    expect(result.items.map((s) => s.id)).toContain(teamOnlyShiftId);
  });
  it('an Own-scope caller (Employee) sees only their own shifts', async () => {
    const { service, tenant, memberA1, shiftA1 } = await world();
    const result = await service.list(
      anAccessContext(memberA1, { tenantId: tenant.id, scope: RowScope.Own }),
      {},
      page,
    );
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(shiftA1);
  });
  it('narrows further with a status filter inside the caller’s scope', async () => {
    const { service, tenant, director } = await world();
    const result = await service.list(
      anAccessContext(director, { tenantId: tenant.id, scope: RowScope.All }),
      { status: ShiftStatus.Completed },
      page,
    );
    expect(result.total).toBe(1);
  });
  it('paginates with limit and offset', async () => {
    const { service, tenant, director } = await world();
    const result = await service.list(
      anAccessContext(director, { tenantId: tenant.id, scope: RowScope.All }),
      {},
      { limit: 2, offset: 0 },
    );
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(4);
  });
});
describe('ShiftsService.get — row scope', () => {
  it('an All-scope caller can fetch any shift', async () => {
    const { service, tenant, director, shiftB1 } = await world();
    const view = await service.get(
      anAccessContext(director, { tenantId: tenant.id, scope: RowScope.All }),
      shiftB1,
    );
    expect(view.id).toBe(shiftB1);
  });
  it('a Team-scope caller can fetch a teammate’s shift', async () => {
    const { service, tenant, teamLeadA, shiftA1 } = await world();
    const view = await service.get(
      anAccessContext(teamLeadA, { tenantId: tenant.id, scope: RowScope.Team }),
      shiftA1,
    );
    expect(view.id).toBe(shiftA1);
  });
  it('a Team-scope caller cannot fetch another team’s shift', async () => {
    const { service, tenant, teamLeadA, shiftB1 } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.get(anAccessContext(teamLeadA, { tenantId: tenant.id, scope: RowScope.Team }), shiftB1),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('a Team-scope caller cannot fetch an unassigned shift', async () => {
    const { service, tenant, teamLeadA, shiftUnassigned } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.get(anAccessContext(teamLeadA, { tenantId: tenant.id, scope: RowScope.Team }), shiftUnassigned),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('an Own-scope caller cannot fetch someone else’s shift', async () => {
    const { service, tenant, memberA1, shiftA2 } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.get(anAccessContext(memberA1, { tenantId: tenant.id, scope: RowScope.Own }), shiftA2),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('answers 404 auth.out_of_scope for a shift outside the tenant', async () => {
    const { service, tenant, director } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.get(anAccessContext(director, { tenantId: tenant.id, scope: RowScope.All }), 999999),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
});
