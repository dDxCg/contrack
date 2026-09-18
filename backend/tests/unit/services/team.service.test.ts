import { anAccessContext } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { Team } from '../../../models/teams/team.entity';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { TeamRepository } from '../../../repositories/teams/team.repository';
import { RowScope } from '../../../services/access-control/row-scope';
import { TeamService } from '../../../services/teams/team.service';
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
function draftTeam(overrides: Partial<Team>): Team {
  const team = new Team();
  team.setName('Tổ');
  team.setCode('T0');
  Object.assign(team, overrides);
  return team;
}
async function world() {
  const dataSource = await createTestDataSource();
  const teams = new TeamRepository(dataSource);
  const employees = new EmployeeRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const otherTenant = await seedTenant(dataSource, { name: 'Other Tenant' });
  const director = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'giam.doc@example.com', role: Role.Director }),
  );
  const manager = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'quan.ly@example.com', role: Role.Manager }),
  );
  const teamT1 = await teams.create(draftTeam({ tenantId: tenant.id, name: 'Tổ 1 — HVAC', code: 'T1' }));
  const teamT3 = await teams.create(draftTeam({ tenantId: tenant.id, name: 'Tổ 3 — PCCC', code: 'T3' }));
  const otherTenantTeam = await teams.create(
    draftTeam({ tenantId: otherTenant.id, name: 'Tổ của tenant khác', code: 'T9' }),
  );
  const teamLead = await employees.create(
    draftEmployee({
      tenantId: tenant.id,
      name: 'Trần Văn Tổ Trưởng',
      email: 'to.truong@example.com',
      role: Role.TeamLead,
      teamId: teamT1.id,
    }),
  );
  const member = await employees.create(
    draftEmployee({
      tenantId: tenant.id,
      email: 'toan.nv@example.com',
      role: Role.Employee,
      teamId: teamT1.id,
    }),
  );
  const teamLessLead = await employees.create(
    draftEmployee({ tenantId: tenant.id, role: Role.TeamLead, teamId: null }),
  );
  return {
    dataSource,
    teams,
    employees,
    service: new TeamService(teams, employees),
    tenant,
    otherTenant,
    teamT1,
    teamT3,
    otherTenantTeam,
    director,
    manager,
    teamLead,
    member,
    teamLessLead,
    directorAccess: anAccessContext(director),
    managerAccess: anAccessContext(manager),
    teamLeadAccess: anAccessContext(teamLead, { scope: RowScope.Team }),
    teamLessLeadAccess: anAccessContext(teamLessLead, { scope: RowScope.Team }),
  };
}
describe('TeamService.list — FR18, lead and member_count derived from employees', () => {
  it('answers every team of the caller’s tenant, with the lead derived from members', async () => {
    const { service, directorAccess, teamT1, teamT3, teamLead } = await world();
    const page = await service.list(directorAccess);
    expect(page.items).toEqual([
      { id: teamT1.id, name: 'Tổ 1 — HVAC', code: 'T1', lead: teamLead.name, member_count: 2 },
      { id: teamT3.id, name: 'Tổ 3 — PCCC', code: 'T3', lead: null, member_count: 0 },
    ]);
  });
  it('shows a manager every team of the tenant (scope all)', async () => {
    const { service, managerAccess, teamT1, teamT3 } = await world();
    const page = await service.list(managerAccess);
    expect(page.items.map((team) => team.id)).toEqual([teamT1.id, teamT3.id]);
  });
  it('narrows a team lead to their own team (scope team)', async () => {
    const { service, teamLeadAccess, teamT1, teamLead } = await world();
    const page = await service.list(teamLeadAccess);
    expect(page.items.map((team) => team.id)).toEqual([teamT1.id]);
    expect(page.items[0].lead).toBe(teamLead.name);
  });
  it('answers an empty list for a team lead who belongs to no team', async () => {
    const { service, teamLessLeadAccess } = await world();
    expect((await service.list(teamLessLeadAccess)).items).toEqual([]);
  });
});
describe('TeamService.get', () => {
  it('returns a team of the caller’s tenant', async () => {
    const { service, directorAccess, teamT3 } = await world();
    await expect(service.get(directorAccess, teamT3.id)).resolves.toEqual({
      id: teamT3.id,
      name: 'Tổ 3 — PCCC',
      code: 'T3',
      lead: null,
      member_count: 0,
    });
  });
  it('answers 404 auth.out_of_scope for another tenant’s team', async () => {
    const { service, directorAccess, otherTenantTeam } = await world();
    const error = await captureDomainErrorAsync(() => service.get(directorAccess, otherTenantTeam.id));
    expect(error.code).toBe('auth.out_of_scope');
    expect(error.getStatus()).toBe(404);
  });
  it('answers 404 for a team inside the tenant but outside a team lead’s scope (QR3)', async () => {
    const { service, teamLeadAccess, teamT1, teamT3 } = await world();
    const error = await captureDomainErrorAsync(() => service.get(teamLeadAccess, teamT3.id));
    expect(error.code).toBe('auth.out_of_scope');
    expect((await service.get(teamLeadAccess, teamT1.id)).id).toBe(teamT1.id);
  });
  it('answers 404 for a team that does not exist', async () => {
    const { service, directorAccess } = await world();
    expect((await captureDomainErrorAsync(() => service.get(directorAccess, 999999))).code).toBe(
      'auth.out_of_scope',
    );
  });
});
describe('TeamService.create', () => {
  it('creates a team inside the caller’s tenant, with no lead and no member yet', async () => {
    const { service, directorAccess, teams, tenant } = await world();
    const created = await service.create(directorAccess, { name: 'Tổ 4 — Vệ sinh', code: 'T4' });
    expect(created).toMatchObject({ name: 'Tổ 4 — Vệ sinh', code: 'T4', lead: null, member_count: 0 });
    expect((await teams.findById(tenant.id, created.id))?.tenantId).toBe(tenant.id);
  });
  it('answers 409 team.code_taken inside the tenant', async () => {
    const { service, directorAccess } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.create(directorAccess, { name: 'Trùng mã', code: 'T1' }),
    );
    expect(error.code).toBe('team.code_taken');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ code: 'T1' });
  });
  it('allows a code another tenant already uses (teams.code is unique per tenant)', async () => {
    const { teams, employees, otherTenant } = await world();
    const directorOfTenantTwo = await employees.create(
      draftEmployee({ tenantId: otherTenant.id, email: 'giam.doc.2@example.com', role: Role.Director }),
    );
    const service = new TeamService(teams, employees);
    const created = await service.create(anAccessContext(directorOfTenantTwo), { name: 'Tổ 1', code: 'T1' });
    expect(created).toMatchObject({ code: 'T1' });
  });
});
describe('TeamService.update', () => {
  it('renames a team and changes its code', async () => {
    const { service, directorAccess, teams, tenant, teamT3 } = await world();
    const updated = await service.update(directorAccess, teamT3.id, {
      name: 'Tổ 3 — PCCC & PCS',
      code: 'T3B',
    });
    expect(updated).toMatchObject({ id: teamT3.id, name: 'Tổ 3 — PCCC & PCS', code: 'T3B' });
    expect((await teams.findById(tenant.id, teamT3.id))?.code).toBe('T3B');
  });
  it('keeps the current code when the form does not change it', async () => {
    const { service, directorAccess, teamT3 } = await world();
    await expect(service.update(directorAccess, teamT3.id, { name: 'Tổ 3' })).resolves.toMatchObject({
      code: 'T3',
    });
  });
  it('answers 409 team.code_taken when renamed onto another team’s code', async () => {
    const { service, directorAccess, teamT3 } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.update(directorAccess, teamT3.id, { code: 'T1' }),
    );
    expect(error.code).toBe('team.code_taken');
    expect(error.details).toEqual({ code: 'T1' });
  });
  it('answers 404 for another tenant’s team', async () => {
    const { service, directorAccess, otherTenantTeam } = await world();
    expect(
      (await captureDomainErrorAsync(() => service.update(directorAccess, otherTenantTeam.id, { name: 'x' })))
        .code,
    ).toBe('auth.out_of_scope');
  });
});
describe('TeamService.delete', () => {
  it('refuses while members belong to the team (team.has_members, FR18)', async () => {
    const { service, directorAccess, teams, tenant, teamT1, teamLead, member } = await world();
    const error = await captureDomainErrorAsync(() => service.delete(directorAccess, teamT1.id));
    expect(error.code).toBe('team.has_members');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ employee_ids: [teamLead.id, member.id] });
    expect(await teams.findById(tenant.id, teamT1.id)).not.toBeNull();
  });
  it('deletes an empty team', async () => {
    const { service, directorAccess, teams, tenant, teamT3 } = await world();
    await service.delete(directorAccess, teamT3.id);
    expect(await teams.findById(tenant.id, teamT3.id)).toBeNull();
  });
  it('answers 404 for another tenant’s team', async () => {
    const { service, directorAccess, teams, otherTenant, otherTenantTeam } = await world();
    const error = await captureDomainErrorAsync(() => service.delete(directorAccess, otherTenantTeam.id));
    expect(error.code).toBe('auth.out_of_scope');
    expect(await teams.findById(otherTenant.id, otherTenantTeam.id)).not.toBeNull();
  });
});
