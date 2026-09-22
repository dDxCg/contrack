import { anEmployee } from '../../../support/builders';
import { captureDomainErrorAsync } from '../../../support/domain-errors';
import { createTestDataSource } from '../../../support/pg-mem-data-source';
import { seedTenant } from '../../../support/seed';
import { EmployeeStatus, Role } from '../../../../models/employees/employee.entity';
import { TenantStatus } from '../../../../models/tenants/tenant.entity';
import { EmployeeRepository } from '../../../../repositories/employees/employee.repository';
import { TenantRepository } from '../../../../repositories/tenants/tenant.repository';
import { AccessRequirement } from '../../../../services/access-control/access.decorator';
import { DeskCredentialResolver } from '../../../../services/access-control/desk-credential-resolver';
import { Operation, Resource, RoleResolver } from '../../../../services/access-control/role-resolver';
import { RowScope } from '../../../../services/access-control/row-scope';
import { ScopeResolver } from '../../../../services/access-control/scope-resolver';
import { TenantResolver } from '../../../../services/access-control/tenant-resolver';
import { TokenClaims } from '../../../../services/auth/token.service';

async function world(
  employeeOverrides: {
    role?: Role;
    status?: EmployeeStatus;
  } = {},
  tenantOverrides: {
    status?: TenantStatus;
  } = {},
) {
  const dataSource = await createTestDataSource();
  const employees = new EmployeeRepository(dataSource);
  const tenants = new TenantRepository(dataSource);
  const tenant = await seedTenant(dataSource, { status: tenantOverrides.status ?? TenantStatus.Active });
  const roleResolver = new RoleResolver();
  const resolver = new DeskCredentialResolver(
    employees,
    tenants,
    new TenantResolver(),
    roleResolver,
    new ScopeResolver(roleResolver),
  );
  const employee = await employees.create(
    Object.assign(anEmployee(), {
      id: undefined,
      tenantId: tenant.id,
      email: `employee-${Math.random()}@example.com`,
      passwordHash: 'x',
      role: employeeOverrides.role ?? Role.Director,
      status: employeeOverrides.status ?? EmployeeStatus.Active,
    }),
  );

  return { resolver, tenant, employee };
}

function claimsFor(
  sub: number,
  tenantId: number,
): TokenClaims & {
  sub: number;
  tenant_id: number;
} {
  return { typ: 'access', jti: 't', iat: 0, exp: Number.MAX_SAFE_INTEGER, sub, tenant_id: tenantId };
}

const readCustomers: AccessRequirement = { resource: Resource.Customers, operation: Operation.Read };
describe('DeskCredentialResolver', () => {
  it('loads the employee and returns an all-scope AccessContext for a granted role+resource', async () => {
    const { resolver, tenant, employee } = await world();
    const access = await resolver.resolve(claimsFor(employee.id, tenant.id), readCustomers);
    expect(access.tenantId).toBe(tenant.id);
    expect(access.employee.id).toBe(employee.id);
    expect(access.scope).toBe(RowScope.All);
  });
  it('refuses a role with no grant for the requested resource+operation', async () => {
    const { resolver, tenant, employee } = await world({ role: Role.Employee });
    const error = await captureDomainErrorAsync(() =>
      resolver.resolve(claimsFor(employee.id, tenant.id), readCustomers),
    );
    expect(error.code).toBe('auth.forbidden_role');
  });
  it('refuses a token whose subject is not a known employee', async () => {
    const { resolver, tenant, employee } = await world();
    const error = await captureDomainErrorAsync(() =>
      resolver.resolve(claimsFor(employee.id + 999, tenant.id), readCustomers),
    );
    expect(error.code).toBe('auth.credential_expired');
  });
  it('refuses a terminated employee even with a signature-valid token', async () => {
    const { resolver, tenant, employee } = await world({ status: EmployeeStatus.Terminated });
    const error = await captureDomainErrorAsync(() =>
      resolver.resolve(claimsFor(employee.id, tenant.id), readCustomers),
    );
    expect(error.code).toBe('auth.credential_expired');
  });
  it('refuses claims missing sub/tenant_id (a malformed access token)', async () => {
    const { resolver } = await world();
    const error = await captureDomainErrorAsync(() =>
      resolver.resolve({ typ: 'access', jti: 't', iat: 0, exp: Number.MAX_SAFE_INTEGER }, readCustomers),
    );
    expect(error.code).toBe('auth.credential_expired');
  });
  it('returns RowScope.None with no requirement (a @Public()-adjacent lookup)', async () => {
    const { resolver, tenant, employee } = await world();
    const access = await resolver.resolve(claimsFor(employee.id, tenant.id));
    expect(access.scope).toBe(RowScope.None);
  });
  it('refuses a suspended tenant even with an otherwise valid, still-live token', async () => {
    const { resolver, tenant, employee } = await world({}, { status: TenantStatus.Suspended });
    const error = await captureDomainErrorAsync(() =>
      resolver.resolve(claimsFor(employee.id, tenant.id), readCustomers),
    );
    expect(error.code).toBe('tenant.suspended');
  });
});
