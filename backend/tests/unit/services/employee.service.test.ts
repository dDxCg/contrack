import { anAccessContext } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { Team } from '../../../models/teams/team.entity';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { TeamRepository } from '../../../repositories/teams/team.repository';
import { BcryptPasswordHasher } from '../../../services/auth/password-hasher.service';
import { EmployeeCommand, EmployeeService } from '../../../services/employees/employee.service';
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
function draftTeam(overrides: Partial<Team>): Team {
  const team = new Team();
  team.setName('Tổ');
  team.setCode('T0');
  Object.assign(team, overrides);
  return team;
}
async function world() {
  const dataSource = await createTestDataSource();
  const employees = new EmployeeRepository(dataSource);
  const teams = new TeamRepository(dataSource);
  const hasher = new BcryptPasswordHasher(4);
  const tenant = await seedTenant(dataSource);
  const otherTenant = await seedTenant(dataSource, { name: 'Other Tenant' });
  const teamT1 = await teams.create(draftTeam({ tenantId: tenant.id, name: 'Tổ 1 — HVAC', code: 'T1' }));
  const teamT3 = await teams.create(draftTeam({ tenantId: tenant.id, name: 'Tổ 3 — PCCC', code: 'T3' }));
  const director = await employees.create(
    draftEmployee({ tenantId: tenant.id, email: 'giam.doc@example.com', role: Role.Director }),
  );
  const toan = await employees.create(
    draftEmployee({
      tenantId: tenant.id,
      email: 'toan.nv@example.com',
      role: Role.Employee,
      teamId: teamT1.id,
    }),
  );
  const teamLead = await employees.create(
    draftEmployee({
      tenantId: tenant.id,
      email: 'to.truong@example.com',
      role: Role.TeamLead,
      teamId: teamT1.id,
    }),
  );
  const otherTenantEmployee = await employees.create(
    draftEmployee({ tenantId: otherTenant.id, email: 'van.a@example.com', role: Role.Director }),
  );
  return {
    dataSource,
    employees,
    teams,
    hasher,
    tenant,
    otherTenant,
    teamT1,
    teamT3,
    director,
    toan,
    teamLead,
    otherTenantEmployee,
    access: anAccessContext(director),
    service: new EmployeeService(employees, teams, hasher),
  };
}
function command(overrides: Partial<EmployeeCommand> = {}): EmployeeCommand {
  return { name: 'Nguyễn Văn Toàn', email: 'toan.nv@example.com', role: Role.Employee, ...overrides };
}
describe('EmployeeService.list — FR18, Director only', () => {
  it('answers the collection envelope with only the caller’s tenant', async () => {
    const { service, access, director, toan, teamLead } = await world();
    const page = await service.list(access, { limit: 25, offset: 0 });
    expect(page.total).toBe(3);
    expect(page.items.map((employee) => employee.id)).toEqual([director.id, toan.id, teamLead.id]);
  });
  it('returns the schema shape and never the stored hash', async () => {
    const { service, access, director } = await world();
    const page = await service.list(access, { limit: 25, offset: 0 });
    expect(page.items[0]).toEqual({
      id: director.id,
      name: 'Lê Thị Mai',
      contact: null,
      email: 'giam.doc@example.com',
      role: Role.Director,
      manager_id: null,
      team_id: null,
      status: EmployeeStatus.Active,
    });
    expect(JSON.stringify(page)).not.toContain('password');
  });
  it('pages through the tenant', async () => {
    const { service, access, teamLead } = await world();
    const page = await service.list(access, { limit: 2, offset: 2 });
    expect(page.items.map((employee) => employee.id)).toEqual([teamLead.id]);
    expect(page.total).toBe(3);
  });
});
describe('EmployeeService.get', () => {
  it('returns an employee of the caller’s tenant', async () => {
    const { service, access, toan, teamT1 } = await world();
    await expect(service.get(access, toan.id)).resolves.toMatchObject({
      id: toan.id,
      email: 'toan.nv@example.com',
      team_id: teamT1.id,
    });
  });
  it('answers 404 auth.out_of_scope for another tenant’s employee', async () => {
    const { service, access, otherTenantEmployee } = await world();
    const otherTenant = await captureDomainErrorAsync(() => service.get(access, otherTenantEmployee.id));
    const missing = await captureDomainErrorAsync(() => service.get(access, 999999));
    expect(otherTenant.code).toBe('auth.out_of_scope');
    expect(otherTenant.getStatus()).toBe(404);
    expect(otherTenant.details).toEqual(missing.details);
  });
});
describe('EmployeeService.create', () => {
  it('creates an account whose initial password is its own email (05-api.md §7)', async () => {
    const { service, access, employees, hasher, tenant } = await world();
    const created = await service.create(
      access,
      command({ email: 'moi.nv@example.com', name: 'Nguyễn Văn Mới' }),
    );
    expect(created).toMatchObject({
      email: 'moi.nv@example.com',
      role: Role.Employee,
      status: EmployeeStatus.Active,
    });
    const stored = await employees.findById(tenant.id, created.id);
    expect(stored?.passwordHash).not.toBe('moi.nv@example.com');
    await expect(hasher.verify('moi.nv@example.com', stored!.passwordHash!)).resolves.toBe(true);
  });
  it('hashes an explicitly supplied password instead', async () => {
    const { service, access, employees, hasher, tenant } = await world();
    const created = await service.create(
      access,
      command({ email: 'moi.nv@example.com', password: 'S3cret!' }),
    );
    const stored = await employees.findById(tenant.id, created.id);
    await expect(hasher.verify('S3cret!', stored!.passwordHash!)).resolves.toBe(true);
    expect(JSON.stringify(stored)).not.toContain('S3cret!');
  });
  it('keeps manager and team empty when the form does not set them', async () => {
    const { service, access, employees, tenant } = await world();
    const created = await service.create(access, command({ email: 'moi.nv@example.com' }));
    expect(created).toMatchObject({ manager_id: null, team_id: null });
    const stored = await employees.findById(tenant.id, created.id);
    expect(stored?.tenantId).toBe(tenant.id);
  });
  it('answers 409 employee.email_taken inside one tenant', async () => {
    const { service, access } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.create(access, command({ email: 'toan.nv@example.com' })),
    );
    expect(error.code).toBe('employee.email_taken');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ email: 'toan.nv@example.com' });
  });
  it('still answers 409 employee.email_taken when a race slips past the pre-check', async () => {
    const { service, access, employees } = await world();
    jest.spyOn(employees, 'existsEmail').mockResolvedValue(false);

    const error = await captureDomainErrorAsync(() =>
      service.create(access, command({ email: 'toan.nv@example.com' })),
    );

    expect(error.code).toBe('employee.email_taken');
    expect(error.getStatus()).toBe(409);
  });
  it('refuses an email another tenant already uses (email is globally unique, D1)', async () => {
    const { employees, teams, otherTenant } = await world();
    const directorOfTenantTwo = await employees.create(
      draftEmployee({ tenantId: otherTenant.id, email: 'giam.doc.2@example.com', role: Role.Director }),
    );
    const service = new EmployeeService(employees, teams, new BcryptPasswordHasher(4));
    const error = await captureDomainErrorAsync(() =>
      service.create(anAccessContext(directorOfTenantTwo), command({ email: 'toan.nv@example.com' })),
    );
    expect(error.code).toBe('employee.email_taken');
    expect(error.getStatus()).toBe(409);
  });
  it('answers 409 team.lead_conflict when the team already has a lead (FR18)', async () => {
    const { service, access, teamT1, teamLead } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.create(
        access,
        command({
          email: 'to.truong.2@example.com',
          role: Role.TeamLead,
          teamId: teamT1.id,
          managerId: null,
        }),
      ),
    );
    expect(error.code).toBe('team.lead_conflict');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ employee_id: teamLead.id });
  });
  it('accepts the first team lead of a leadless team', async () => {
    const { service, access, teamT3 } = await world();
    const created = await service.create(
      access,
      command({ email: 'to.truong.3@example.com', role: Role.TeamLead, teamId: teamT3.id, managerId: null }),
    );
    expect(created).toMatchObject({ role: Role.TeamLead, team_id: teamT3.id });
  });
  it('accepts a team lead who belongs to no team', async () => {
    const { service, access } = await world();
    const created = await service.create(
      access,
      command({ email: 'to.truong.4@example.com', role: Role.TeamLead }),
    );
    expect(created).toMatchObject({ role: Role.TeamLead, team_id: null });
  });
});
describe('EmployeeService.update', () => {
  it('changes role, team, name and contact in one call', async () => {
    const { service, access, employees, tenant, toan, teamT3 } = await world();
    const updated = await service.update(
      access,
      toan.id,
      command({
        name: 'Nguyễn Văn Toàn',
        email: 'toan.nv@example.com',
        role: Role.TeamLead,
        teamId: teamT3.id,
        contact: '0909 111 222',
      }),
    );
    expect(updated).toMatchObject({
      id: toan.id,
      role: Role.TeamLead,
      team_id: teamT3.id,
      contact: '0909 111 222',
    });
    expect(await employees.findById(tenant.id, toan.id)).toMatchObject({
      teamId: teamT3.id,
      role: Role.TeamLead,
    });
  });
  it('answers 400 employee.manager_cycle with the reporting path it would close', async () => {
    const { service, access, dataSource, employees, tenant, toan, teamLead } = await world();
    await dataSource.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [toan.id, teamLead.id]);
    const error = await captureDomainErrorAsync(() =>
      service.update(access, toan.id, command({ email: 'toan.nv@example.com', managerId: teamLead.id })),
    );
    expect(error.code).toBe('employee.manager_cycle');
    expect(error.getStatus()).toBe(400);
    expect(error.details).toEqual({ path: [toan.id, teamLead.id, toan.id] });
    expect((await employees.findById(tenant.id, toan.id))!.managerId).toBeNull();
  });
  it('accepts a manager who reports to nobody this employee manages', async () => {
    const { service, access, employees, tenant, toan, teamLead } = await world();
    const updated = await service.update(
      access,
      toan.id,
      command({ email: 'toan.nv@example.com', managerId: teamLead.id }),
    );
    expect(updated).toMatchObject({ manager_id: teamLead.id });
    expect((await employees.findById(tenant.id, toan.id))!.managerId).toBe(teamLead.id);
  });
  it('answers 409 team.lead_conflict when promoting into a team that already has a lead', async () => {
    const { service, access, toan, teamT1, teamLead } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.update(
        access,
        toan.id,
        command({ email: 'toan.nv@example.com', role: Role.TeamLead, teamId: teamT1.id }),
      ),
    );
    expect(error.code).toBe('team.lead_conflict');
    expect(error.details).toEqual({ employee_id: teamLead.id });
  });
  it('lets an employee keep their own email', async () => {
    const { service, access, toan } = await world();
    await expect(
      service.update(access, toan.id, command({ email: 'toan.nv@example.com' })),
    ).resolves.toMatchObject({
      id: toan.id,
    });
  });
  it('answers 409 employee.email_taken when renamed onto another account', async () => {
    const { service, access, toan } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.update(access, toan.id, command({ email: 'to.truong@example.com' })),
    );
    expect(error.code).toBe('employee.email_taken');
    expect(error.details).toEqual({ email: 'to.truong@example.com' });
  });
  it('resets the password only when one is supplied', async () => {
    const { service, access, employees, tenant, hasher, toan } = await world();
    await service.update(access, toan.id, command({ email: 'toan.nv@example.com', password: 'MatKhauMoi1' }));
    const stored = (await employees.findById(tenant.id, toan.id))!;
    await expect(hasher.verify('MatKhauMoi1', stored.passwordHash!)).resolves.toBe(true);
  });
  it('answers 404 for another tenant’s employee and leaves the row alone', async () => {
    const { service, access, employees, otherTenantEmployee } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.update(access, otherTenantEmployee.id, command({ email: 'van.a@example.com' })),
    );
    expect(error.code).toBe('auth.out_of_scope');
    expect((await employees.findById(otherTenantEmployee.tenantId, otherTenantEmployee.id))!.name).toBe(
      'Lê Thị Mai',
    );
  });
});
describe('EmployeeService.deactivate', () => {
  it('refuses while future shifts are assigned (employee.has_assigned_shifts, FR18)', async () => {
    const { service, access, dataSource, employees, tenant, toan } = await world();
    const chain = await seedContractItemChain(dataSource, tenant.id);
    const futureDate = '2099-01-01';
    const shift1 = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: toan.id,
      scheduledDate: futureDate,
    });
    const shift2 = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: toan.id,
      scheduledDate: futureDate,
    });
    const error = await captureDomainErrorAsync(() => service.deactivate(access, toan.id));
    expect(error.code).toBe('employee.has_assigned_shifts');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ shift_ids: [shift1, shift2] });
    expect((await employees.findById(tenant.id, toan.id))!.status).toBe(EmployeeStatus.Active);
  });
  it('soft-deletes an employee with no future shift — status = terminated, row kept', async () => {
    const { service, access, employees, tenant, toan } = await world();
    const result = await service.deactivate(access, toan.id);
    expect(result.status).toBe(EmployeeStatus.Terminated);
    expect((await employees.findById(tenant.id, toan.id))!.status).toBe(EmployeeStatus.Terminated);
  });
  it('answers 404 for another tenant’s employee', async () => {
    const { service, access, employees, otherTenantEmployee } = await world();
    const error = await captureDomainErrorAsync(() => service.deactivate(access, otherTenantEmployee.id));
    expect(error.code).toBe('auth.out_of_scope');
    expect((await employees.findById(otherTenantEmployee.tenantId, otherTenantEmployee.id))!.status).toBe(
      EmployeeStatus.Active,
    );
  });
});
