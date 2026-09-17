import { anAccessContext, anEmployee, aTeam } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import {
  InMemoryDb,
  InMemoryEmployeeRepository,
  InMemoryTeamRepository,
} from '../../support/in-memory-repositories';
import { EmployeeStatus, Role } from '../../../Models/employee.entity';
import { BcryptPasswordHasher } from '../../../Services/password-hasher.service';
import { EmployeeCommand, EmployeeService } from '../../../Services/employee.service';

function world() {
  const db = new InMemoryDb();
  const employees = new InMemoryEmployeeRepository(db);
  const teams = new InMemoryTeamRepository(db);
  const hasher = new BcryptPasswordHasher(4);

  const director = anEmployee({ id: 12, tenantId: 1, email: 'giam.doc@example.com', role: Role.Director });
  const toan = anEmployee({ id: 31, tenantId: 1, email: 'toan.nv@example.com', role: Role.Employee, teamId: 7 });
  const teamLead = anEmployee({ id: 40, tenantId: 1, email: 'to.truong@example.com', role: Role.TeamLead, teamId: 7 });
  const otherTenant = anEmployee({ id: 41, tenantId: 2, email: 'van.a@example.com', role: Role.Director });
  db.employees.push(director, toan, teamLead, otherTenant);
  db.teams.push(aTeam({ id: 7, tenantId: 1, name: 'Tổ 1 — HVAC', code: 'T1' }));
  db.teams.push(aTeam({ id: 8, tenantId: 1, name: 'Tổ 3 — PCCC', code: 'T3' }));

  return {
    db,
    employees,
    teams,
    hasher,
    access: anAccessContext(director),
    service: new EmployeeService(employees, teams, hasher),
  };
}

function command(overrides: Partial<EmployeeCommand> = {}): EmployeeCommand {
  return { name: 'Nguyễn Văn Toàn', email: 'toan.nv@example.com', role: Role.Employee, ...overrides };
}

describe('EmployeeService.list — FR18, Director only', () => {
  it('answers the collection envelope with only the caller’s tenant', async () => {
    const { service, access } = world();

    const page = await service.list(access, { limit: 25, offset: 0 });

    expect(page.total).toBe(3);
    expect(page.items.map((employee) => employee.id)).toEqual([12, 31, 40]);
  });

  it('returns the schema shape and never the stored hash', async () => {
    const { service, access } = world();

    const page = await service.list(access, { limit: 25, offset: 0 });

    expect(page.items[0]).toEqual({
      id: 12,
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
    const { service, access } = world();

    const page = await service.list(access, { limit: 2, offset: 2 });

    expect(page.items.map((employee) => employee.id)).toEqual([40]);
    expect(page.total).toBe(3);
  });
});

describe('EmployeeService.get', () => {
  it('returns an employee of the caller’s tenant', async () => {
    const { service, access } = world();

    await expect(service.get(access, 31)).resolves.toMatchObject({
      id: 31,
      email: 'toan.nv@example.com',
      team_id: 7,
    });
  });

  it('answers 404 auth.out_of_scope for another tenant’s employee', async () => {
    const { service, access } = world();

    const otherTenant = await captureDomainErrorAsync(() => service.get(access, 41));
    const missing = await captureDomainErrorAsync(() => service.get(access, 999));

    expect(otherTenant.code).toBe('auth.out_of_scope');
    expect(otherTenant.getStatus()).toBe(404);
    expect(otherTenant.details).toEqual(missing.details);
  });
});

describe('EmployeeService.create', () => {
  it('creates an account whose initial password is its own email (05-api.md §7)', async () => {
    const { service, access, db, hasher } = world();

    const created = await service.create(access, command({ email: 'moi.nv@example.com', name: 'Nguyễn Văn Mới' }));

    expect(created).toMatchObject({ email: 'moi.nv@example.com', role: Role.Employee, status: EmployeeStatus.Active });
    const stored = db.employees.find((employee) => employee.email === 'moi.nv@example.com');
    expect(stored?.passwordHash).not.toBe('moi.nv@example.com');
    await expect(hasher.verify('moi.nv@example.com', stored!.passwordHash!)).resolves.toBe(true);
  });

  it('hashes an explicitly supplied password instead', async () => {
    const { service, access, db, hasher } = world();

    await service.create(access, command({ email: 'moi.nv@example.com', password: 'S3cret!' }));

    const stored = db.employees.find((employee) => employee.email === 'moi.nv@example.com');
    await expect(hasher.verify('S3cret!', stored!.passwordHash!)).resolves.toBe(true);
    expect(JSON.stringify(stored)).not.toContain('S3cret!');
  });

  it('keeps manager and team empty when the form does not set them', async () => {
    const { service, access, db } = world();

    const created = await service.create(access, command({ email: 'moi.nv@example.com' }));

    expect(created).toMatchObject({ manager_id: null, team_id: null });
    const stored = db.employees.find((employee) => employee.email === 'moi.nv@example.com');
    expect(stored?.tenantId).toBe(1);
  });

  it('answers 409 employee.email_taken inside one tenant', async () => {
    const { service, access } = world();

    const error = await captureDomainErrorAsync(() =>
      service.create(access, command({ email: 'toan.nv@example.com' })),
    );

    expect(error.code).toBe('employee.email_taken');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ email: 'toan.nv@example.com' });
  });

  it('refuses an email another tenant already uses (email is globally unique, D1)', async () => {
    const { db } = world();
    const employees = new InMemoryEmployeeRepository(db);
    const teams = new InMemoryTeamRepository(db);
    const directorOfTenantTwo = anEmployee({ id: 51, tenantId: 2, email: 'giam.doc.2@example.com', role: Role.Director });
    const service = new EmployeeService(employees, teams, new BcryptPasswordHasher(4));

    const error = await captureDomainErrorAsync(() =>
      service.create(anAccessContext(directorOfTenantTwo), command({ email: 'toan.nv@example.com' })),
    );

    expect(error.code).toBe('employee.email_taken');
    expect(error.getStatus()).toBe(409);
  });

  it('answers 409 team.lead_conflict when the team already has a lead (FR18)', async () => {
    const { service, access } = world();

    const error = await captureDomainErrorAsync(() =>
      service.create(
        access,
        command({ email: 'to.truong.2@example.com', role: Role.TeamLead, teamId: 7, managerId: null }),
      ),
    );

    expect(error.code).toBe('team.lead_conflict');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ employee_id: 40 });
  });

  it('accepts the first team lead of a leadless team', async () => {
    const { service, access } = world();

    const created = await service.create(
      access,
      command({ email: 'to.truong.3@example.com', role: Role.TeamLead, teamId: 8, managerId: null }),
    );

    expect(created).toMatchObject({ role: Role.TeamLead, team_id: 8 });
  });

  it('accepts a team lead who belongs to no team', async () => {
    const { service, access } = world();

    const created = await service.create(access, command({ email: 'to.truong.4@example.com', role: Role.TeamLead }));

    expect(created).toMatchObject({ role: Role.TeamLead, team_id: null });
  });
});

describe('EmployeeService.update', () => {
  it('changes role, team, name and contact in one call', async () => {
    const { service, access, db } = world();

    const updated = await service.update(
      access,
      31,
      command({
        name: 'Nguyễn Văn Toàn',
        email: 'toan.nv@example.com',
        role: Role.TeamLead,
        teamId: 8,
        contact: '0909 111 222',
      }),
    );

    expect(updated).toMatchObject({ id: 31, role: Role.TeamLead, team_id: 8, contact: '0909 111 222' });
    expect(db.employees.find((employee) => employee.id === 31)).toMatchObject({ teamId: 8, role: Role.TeamLead });
  });

  it('answers 400 employee.manager_cycle with the reporting path it would close', async () => {
    const { service, access, db } = world();
    db.employees.find((employee) => employee.id === 40)!.managerId = 31;

    const error = await captureDomainErrorAsync(() =>
      service.update(access, 31, command({ email: 'toan.nv@example.com', managerId: 40 })),
    );

    expect(error.code).toBe('employee.manager_cycle');
    expect(error.getStatus()).toBe(400);
    expect(error.details).toEqual({ path: [31, 40, 31] });
    expect(db.employees.find((employee) => employee.id === 31)!.managerId).toBeNull();
  });

  it('accepts a manager who reports to nobody this employee manages', async () => {
    const { service, access, db } = world();

    const updated = await service.update(access, 31, command({ email: 'toan.nv@example.com', managerId: 40 }));

    expect(updated).toMatchObject({ manager_id: 40 });
    expect(db.employees.find((employee) => employee.id === 31)!.managerId).toBe(40);
  });

  it('answers 409 team.lead_conflict when promoting into a team that already has a lead', async () => {
    const { service, access } = world();

    const error = await captureDomainErrorAsync(() =>
      service.update(access, 31, command({ email: 'toan.nv@example.com', role: Role.TeamLead, teamId: 7 })),
    );

    expect(error.code).toBe('team.lead_conflict');
    expect(error.details).toEqual({ employee_id: 40 });
  });

  it('lets an employee keep their own email', async () => {
    const { service, access } = world();

    await expect(service.update(access, 31, command({ email: 'toan.nv@example.com' }))).resolves.toMatchObject({
      id: 31,
    });
  });

  it('answers 409 employee.email_taken when renamed onto another account', async () => {
    const { service, access } = world();

    const error = await captureDomainErrorAsync(() =>
      service.update(access, 31, command({ email: 'to.truong@example.com' })),
    );

    expect(error.code).toBe('employee.email_taken');
    expect(error.details).toEqual({ email: 'to.truong@example.com' });
  });

  it('resets the password only when one is supplied', async () => {
    const { service, access, db, hasher } = world();

    await service.update(access, 31, command({ email: 'toan.nv@example.com', password: 'MatKhauMoi1' }));

    const stored = db.employees.find((employee) => employee.id === 31)!;
    await expect(hasher.verify('MatKhauMoi1', stored.passwordHash!)).resolves.toBe(true);
  });

  it('answers 404 for another tenant’s employee and leaves the row alone', async () => {
    const { service, access, db } = world();

    const error = await captureDomainErrorAsync(() =>
      service.update(access, 41, command({ email: 'van.a@example.com' })),
    );

    expect(error.code).toBe('auth.out_of_scope');
    expect(db.employees.find((employee) => employee.id === 41)!.name).toBe('Lê Thị Mai');
  });
});

describe('EmployeeService.delete', () => {
  it('refuses while future shifts are assigned (employee.has_assigned_shifts, FR18)', async () => {
    const { service, access, db } = world();
    db.futureShifts.set(31, [40, 41]);

    const error = await captureDomainErrorAsync(() => service.delete(access, 31));

    expect(error.code).toBe('employee.has_assigned_shifts');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ shift_ids: [40, 41] });
    expect(db.employees.some((employee) => employee.id === 31)).toBe(true);
  });

  it('deletes an employee with no future shift', async () => {
    const { service, access, db } = world();

    await service.delete(access, 31);

    expect(db.employees.some((employee) => employee.id === 31)).toBe(false);
  });

  it('answers 404 for another tenant’s employee', async () => {
    const { service, access, db } = world();

    const error = await captureDomainErrorAsync(() => service.delete(access, 41));

    expect(error.code).toBe('auth.out_of_scope');
    expect(db.employees.some((employee) => employee.id === 41)).toBe(true);
  });
});
