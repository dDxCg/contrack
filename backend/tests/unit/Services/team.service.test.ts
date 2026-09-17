import { anAccessContext, anEmployee, aTeam } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import {
  InMemoryDb,
  InMemoryEmployeeRepository,
  InMemoryTeamRepository,
} from '../../support/in-memory-repositories';
import { Role } from '../../../Models/employee.entity';
import { RowScope } from '../../../Services/AccessControl/row-scope';
import { TeamService } from '../../../Services/team.service';

function world() {
  const db = new InMemoryDb();
  const teams = new InMemoryTeamRepository(db);
  const employees = new InMemoryEmployeeRepository(db);

  const director = anEmployee({ id: 12, tenantId: 1, email: 'giam.doc@example.com', role: Role.Director });
  const manager = anEmployee({ id: 13, tenantId: 1, email: 'quan.ly@example.com', role: Role.Manager });
  const teamLead = anEmployee({
    id: 40,
    tenantId: 1,
    name: 'Trần Văn Tổ Trưởng',
    email: 'to.truong@example.com',
    role: Role.TeamLead,
    teamId: 7,
  });
  const member = anEmployee({ id: 31, tenantId: 1, email: 'toan.nv@example.com', role: Role.Employee, teamId: 7 });
  const otherTenantTeam = aTeam({ id: 99, tenantId: 2, name: 'Tổ của tenant khác', code: 'T9' });

  db.employees.push(director, manager, teamLead, member);
  db.teams.push(
    aTeam({ id: 7, tenantId: 1, name: 'Tổ 1 — HVAC', code: 'T1' }),
    aTeam({ id: 8, tenantId: 1, name: 'Tổ 3 — PCCC', code: 'T3' }),
    otherTenantTeam,
  );

  return {
    db,
    teams,
    service: new TeamService(teams, employees),
    directorAccess: anAccessContext(director),
    managerAccess: anAccessContext(manager),
    teamLeadAccess: anAccessContext(teamLead, { scope: RowScope.Team }),
    teamLessLeadAccess: anAccessContext(anEmployee({ id: 41, tenantId: 1, role: Role.TeamLead, teamId: null }), {
      scope: RowScope.Team,
    }),
  };
}

describe('TeamService.list — FR18, lead and member_count derived from employees', () => {
  it('answers every team of the caller’s tenant, with the lead derived from members', async () => {
    const { service, directorAccess } = world();

    const page = await service.list(directorAccess);

    expect(page.items).toEqual([
      { id: 7, name: 'Tổ 1 — HVAC', code: 'T1', lead: 'Trần Văn Tổ Trưởng', member_count: 2 },
      { id: 8, name: 'Tổ 3 — PCCC', code: 'T3', lead: null, member_count: 0 },
    ]);
  });

  it('shows a manager every team of the tenant (scope all)', async () => {
    const { service, managerAccess } = world();

    const page = await service.list(managerAccess);

    expect(page.items.map((team) => team.id)).toEqual([7, 8]);
  });

  it('narrows a team lead to their own team (scope team)', async () => {
    const { service, teamLeadAccess } = world();

    const page = await service.list(teamLeadAccess);

    expect(page.items.map((team) => team.id)).toEqual([7]);
    expect(page.items[0].lead).toBe('Trần Văn Tổ Trưởng');
  });

  it('answers an empty list for a team lead who belongs to no team', async () => {
    const { service, teamLessLeadAccess } = world();

    expect((await service.list(teamLessLeadAccess)).items).toEqual([]);
  });
});

describe('TeamService.get', () => {
  it('returns a team of the caller’s tenant', async () => {
    const { service, directorAccess } = world();

    await expect(service.get(directorAccess, 8)).resolves.toEqual({
      id: 8,
      name: 'Tổ 3 — PCCC',
      code: 'T3',
      lead: null,
      member_count: 0,
    });
  });

  it('answers 404 auth.out_of_scope for another tenant’s team', async () => {
    const { service, directorAccess } = world();

    const error = await captureDomainErrorAsync(() => service.get(directorAccess, 99));

    expect(error.code).toBe('auth.out_of_scope');
    expect(error.getStatus()).toBe(404);
  });

  it('answers 404 for a team inside the tenant but outside a team lead’s scope (QR3)', async () => {
    const { service, teamLeadAccess } = world();

    const error = await captureDomainErrorAsync(() => service.get(teamLeadAccess, 8));

    expect(error.code).toBe('auth.out_of_scope');
    expect((await service.get(teamLeadAccess, 7)).id).toBe(7);
  });

  it('answers 404 for a team that does not exist', async () => {
    const { service, directorAccess } = world();

    expect((await captureDomainErrorAsync(() => service.get(directorAccess, 999))).code).toBe('auth.out_of_scope');
  });
});

describe('TeamService.create', () => {
  it('creates a team inside the caller’s tenant, with no lead and no member yet', async () => {
    const { service, directorAccess, db } = world();

    const created = await service.create(directorAccess, { name: 'Tổ 4 — Vệ sinh', code: 'T4' });

    expect(created).toMatchObject({ name: 'Tổ 4 — Vệ sinh', code: 'T4', lead: null, member_count: 0 });
    expect(db.teams.find((team) => team.id === created.id)?.tenantId).toBe(1);
  });

  it('answers 409 team.code_taken inside the tenant', async () => {
    const { service, directorAccess } = world();

    const error = await captureDomainErrorAsync(() => service.create(directorAccess, { name: 'Trùng mã', code: 'T1' }));

    expect(error.code).toBe('team.code_taken');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ code: 'T1' });
  });

  it('allows a code another tenant already uses (teams.code is unique per tenant)', async () => {
    const { db } = world();
    const teams = new InMemoryTeamRepository(db);
    const employees = new InMemoryEmployeeRepository(db);
    const directorOfTenantTwo = anEmployee({ id: 51, tenantId: 2, email: 'giam.doc.2@example.com', role: Role.Director });
    const service = new TeamService(teams, employees);

    const created = await service.create(anAccessContext(directorOfTenantTwo), { name: 'Tổ 1', code: 'T1' });

    expect(created).toMatchObject({ code: 'T1' });
  });
});

describe('TeamService.update', () => {
  it('renames a team and changes its code', async () => {
    const { service, directorAccess, db } = world();

    const updated = await service.update(directorAccess, 8, { name: 'Tổ 3 — PCCC & PCS', code: 'T3B' });

    expect(updated).toMatchObject({ id: 8, name: 'Tổ 3 — PCCC & PCS', code: 'T3B' });
    expect(db.teams.find((team) => team.id === 8)?.code).toBe('T3B');
  });

  it('keeps the current code when the form does not change it', async () => {
    const { service, directorAccess } = world();

    await expect(service.update(directorAccess, 8, { name: 'Tổ 3' })).resolves.toMatchObject({ code: 'T3' });
  });

  it('answers 409 team.code_taken when renamed onto another team’s code', async () => {
    const { service, directorAccess } = world();

    const error = await captureDomainErrorAsync(() => service.update(directorAccess, 8, { code: 'T1' }));

    expect(error.code).toBe('team.code_taken');
    expect(error.details).toEqual({ code: 'T1' });
  });

  it('answers 404 for another tenant’s team', async () => {
    const { service, directorAccess } = world();

    expect((await captureDomainErrorAsync(() => service.update(directorAccess, 99, { name: 'x' }))).code).toBe(
      'auth.out_of_scope',
    );
  });
});

describe('TeamService.delete', () => {
  it('refuses while members belong to the team (team.has_members, FR18)', async () => {
    const { service, directorAccess, db } = world();

    const error = await captureDomainErrorAsync(() => service.delete(directorAccess, 7));

    expect(error.code).toBe('team.has_members');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ employee_ids: [40, 31] });
    expect(db.teams.some((team) => team.id === 7)).toBe(true);
  });

  it('deletes an empty team', async () => {
    const { service, directorAccess, db } = world();

    await service.delete(directorAccess, 8);

    expect(db.teams.some((team) => team.id === 8)).toBe(false);
  });

  it('answers 404 for another tenant’s team', async () => {
    const { service, directorAccess, db } = world();

    const error = await captureDomainErrorAsync(() => service.delete(directorAccess, 99));

    expect(error.code).toBe('auth.out_of_scope');
    expect(db.teams.some((team) => team.id === 99)).toBe(true);
  });
});
