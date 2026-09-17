import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { anAccessContext } from '../../support/builders';
import { FakeClock } from '../../support/clock';
import { captureDomainError, captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { Employee, EmployeeStatus, Role } from '../../../Models/employee.entity';
import { Tenant, TenantStatus } from '../../../Models/tenant.entity';
import { EmployeeRepository } from '../../../Repositories/employee.repository';
import { TenantRepository } from '../../../Repositories/tenant.repository';
import { AuthConfig } from '../../../Services/AccessControl/auth.config';
import { AccessContext } from '../../../Services/AccessControl/access-context';
import { RowScope } from '../../../Services/AccessControl/row-scope';
import { AuthService } from '../../../Services/auth.service';
import { BcryptPasswordHasher } from '../../../Services/password-hasher.service';
import { TokenService } from '../../../Services/token.service';

const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  bcryptRounds: 4,
};

interface World {
  dataSource: DataSource;
  service: AuthService;
  hasher: BcryptPasswordHasher;
  tokenService: TokenService;
  tenant: Tenant;
  employee: Employee;
}

async function loadWorld(
  setup: { tenant?: { status?: TenantStatus }; employee?: Partial<Employee> } = {},
): Promise<World> {
  const dataSource = await createTestDataSource();
  const employeeRepository = new EmployeeRepository(dataSource);
  const tokenService = new TokenService(
    new JwtService({ secret: config.jwtSecret }),
    config,
    new FakeClock(),
  );
  const hasher = new BcryptPasswordHasher(config.bcryptRounds);

  const tenant = await seedTenant(dataSource, { status: setup.tenant?.status });

  const draft = new Employee();
  draft.tenantId = tenant.id;
  draft.setName('Lê Thị Mai');
  draft.setContact(null);
  draft.email = 'mai.lt@example.com';
  draft.setRole(Role.Manager);
  draft.setTeam(null);
  draft.setManager(null);
  draft.status = EmployeeStatus.Active;
  draft.setPasswordHash(await hasher.hash('secret'));
  Object.assign(draft, setup.employee);

  const employee = await employeeRepository.create(draft);

  return {
    dataSource,
    hasher,
    tokenService,
    tenant,
    employee,
    service: new AuthService(new TenantRepository(dataSource), employeeRepository, tokenService, hasher),
  };
}

function sessionContext(world: World, token: string): AccessContext {
  return anAccessContext(world.employee, {
    tenantId: world.employee.tenantId,
    scope: RowScope.All,
    credential: world.tokenService.verifyAccess(token),
  });
}

describe('AuthService.login — FR22', () => {
  it('exchanges an email and password for a credential pair', async () => {
    const { service, tenant, employee } = await loadWorld();

    const session = await service.login({ email: 'mai.lt@example.com', password: 'secret' });

    expect(session.employee).toEqual({
      id: employee.id,
      tenant_id: tenant.id,
      name: 'Lê Thị Mai',
      role: Role.Manager,
    });
    expect(session.expires_in).toBe(1800);
    expect(session.refresh_token).toEqual(expect.any(String));
    expect(session.token).toEqual(expect.any(String));
  });

  it('issues a credential the caller can present on the next request', async () => {
    const { service, tokenService, tenant, employee } = await loadWorld();

    const session = await service.login({ email: 'mai.lt@example.com', password: 'secret' });

    expect(tokenService.verifyAccess(session.token)).toMatchObject({
      sub: employee.id,
      tenant_id: tenant.id,
      role: Role.Manager,
    });
  });

  it('does not distinguish an unknown email from a wrong password (05-api.md §9)', async () => {
    const { service } = await loadWorld();

    const unknownEmail = await captureDomainErrorAsync(() =>
      service.login({ email: 'nobody@example.com', password: 'secret' }),
    );
    const wrongPassword = await captureDomainErrorAsync(() =>
      service.login({ email: 'mai.lt@example.com', password: 'wrong' }),
    );

    expect(unknownEmail.code).toBe('auth.invalid_credentials');
    expect(unknownEmail.getStatus()).toBe(401);
    expect(wrongPassword.code).toBe('auth.invalid_credentials');
  });

  it('refuses a wrong password', async () => {
    const { service } = await loadWorld();

    const error = await captureDomainErrorAsync(() =>
      service.login({ email: 'mai.lt@example.com', password: 'wrong' }),
    );

    expect(error.code).toBe('auth.invalid_credentials');
  });

  it('refuses a suspended tenant before checking the password (FR24)', async () => {
    const { service, hasher } = await loadWorld({ tenant: { status: TenantStatus.Suspended } });
    const verify = jest.spyOn(hasher, 'verify');

    const error = await captureDomainErrorAsync(() =>
      service.login({ email: 'mai.lt@example.com', password: 'secret' }),
    );

    expect(error.code).toBe('tenant.suspended');
    expect(error.getStatus()).toBe(401);
    expect(verify).not.toHaveBeenCalled();
  });

  it('refuses a terminated employee (FR18 — deactivation applies to their next request)', async () => {
    const { service } = await loadWorld({ employee: { status: EmployeeStatus.Terminated } });

    const error = await captureDomainErrorAsync(() =>
      service.login({ email: 'mai.lt@example.com', password: 'secret' }),
    );

    expect(error.code).toBe('auth.invalid_credentials');
  });

  it('never returns the stored password hash', async () => {
    const { service } = await loadWorld();

    const session = await service.login({ email: 'mai.lt@example.com', password: 'secret' });

    expect(JSON.stringify(session)).not.toContain('$2b$');
  });
});

describe('AuthService.refresh', () => {
  it('exchanges a refresh token for a new pair', async () => {
    const { service } = await loadWorld();
    const session = await service.login({ email: 'mai.lt@example.com', password: 'secret' });

    const refreshed = await service.refresh(session.refresh_token);

    expect(refreshed.token).not.toBe(session.token);
    expect(refreshed.refresh_token).not.toBe(session.refresh_token);
    expect(refreshed.employee).toEqual(session.employee);
  });

  it('rotates: the refresh token it was handed is dead afterwards', async () => {
    const { service } = await loadWorld();
    const session = await service.login({ email: 'mai.lt@example.com', password: 'secret' });
    const refreshed = await service.refresh(session.refresh_token);

    const error = await captureDomainErrorAsync(() => service.refresh(session.refresh_token));

    expect(error.code).toBe('auth.credential_expired');
    expect(error.getStatus()).toBe(401);
    expect((await service.refresh(refreshed.refresh_token)).token).toEqual(expect.any(String));
  });

  it('refuses an access token presented as a refresh token', async () => {
    const { service } = await loadWorld();
    const session = await service.login({ email: 'mai.lt@example.com', password: 'secret' });

    const error = await captureDomainErrorAsync(() => service.refresh(session.token));

    expect(error.code).toBe('auth.credential_expired');
  });

  it('refuses to refresh for an employee who has since been terminated', async () => {
    const { service, dataSource, employee } = await loadWorld();
    const session = await service.login({ email: 'mai.lt@example.com', password: 'secret' });
    await dataSource.query(
      `UPDATE employees SET status_id = (SELECT id FROM employee_statuses WHERE code = 'terminated') WHERE id = $1`,
      [employee.id],
    );

    const error = await captureDomainErrorAsync(() => service.refresh(session.refresh_token));

    expect(error.code).toBe('auth.credential_expired');
  });

  it('fails without leaking which part of the refresh token was wrong', async () => {
    const { service } = await loadWorld();

    const error = await captureDomainErrorAsync(() => service.refresh('not-a-token'));

    expect(error.details).toEqual({});
  });
});

describe('AuthService.logout', () => {
  it('invalidates the credential it was called with', async () => {
    const world = await loadWorld();
    const session = await world.service.login({ email: 'mai.lt@example.com', password: 'secret' });

    await world.service.logout(sessionContext(world, session.token));

    expect(captureDomainError(() => world.tokenService.verifyAccess(session.token)).code).toBe(
      'auth.credential_expired',
    );
  });

  it('invalidates the refresh token too, so a logged-out client cannot silently re-arm', async () => {
    const world = await loadWorld();
    const session = await world.service.login({ email: 'mai.lt@example.com', password: 'secret' });

    await world.service.logout(sessionContext(world, session.token), session.refresh_token);

    const error = await captureDomainErrorAsync(() => world.service.refresh(session.refresh_token));

    expect(error.code).toBe('auth.credential_expired');
  });

  it('still logs out when the client does not send its refresh token', async () => {
    const world = await loadWorld();
    const session = await world.service.login({ email: 'mai.lt@example.com', password: 'secret' });

    await expect(world.service.logout(sessionContext(world, session.token))).resolves.toBeUndefined();
    expect(captureDomainError(() => world.tokenService.verifyAccess(session.token)).code).toBe(
      'auth.credential_expired',
    );
  });

  it('ignores a garbage refresh token rather than failing the logout', async () => {
    const world = await loadWorld();
    const session = await world.service.login({ email: 'mai.lt@example.com', password: 'secret' });

    await expect(
      world.service.logout(sessionContext(world, session.token), 'not-a-token'),
    ).resolves.toBeUndefined();
  });

  it('leaves another idempotent logout call harmless', async () => {
    const world = await loadWorld();
    const session = await world.service.login({ email: 'mai.lt@example.com', password: 'secret' });
    const access = sessionContext(world, session.token);

    await world.service.logout(access);
    await world.service.logout(access);
  });
});

describe('AuthService.me', () => {
  it('returns the caller’s own record', async () => {
    const { service, employee } = await loadWorld();

    expect(service.me(anAccessContext(employee))).toMatchObject({
      id: employee.id,
      name: 'Lê Thị Mai',
      email: 'mai.lt@example.com',
      role: Role.Manager,
      status: EmployeeStatus.Active,
      team_id: null,
      manager_id: null,
    });
  });

  it('never exposes the password hash', async () => {
    const { service, employee } = await loadWorld();

    expect(service.me(anAccessContext(employee))).not.toHaveProperty('password_hash');
  });
});
