import { AccessContext } from '../../Services/AccessControl/access-context';
import { RowScope } from '../../Services/AccessControl/row-scope';
import { TokenClaims } from '../../Services/token.service';
import { Customer, CustomerSegment } from '../../Models/customer.entity';
import { Employee, EmployeeStatus, Role } from '../../Models/employee.entity';
import { Team } from '../../Models/team.entity';
import { Tenant, TenantStatus } from '../../Models/tenant.entity';

export function anEmployee(overrides: Partial<Employee> = {}): Employee {
  const employee = new Employee();

  return Object.assign(
    employee,
    {
      id: 1,
      tenantId: 1,
      name: 'Lê Thị Mai',
      contact: null,
      email: 'mai.lt@example.com',
      passwordHash: null,
      managerId: null,
      teamId: null,
      roleId: 0,
      statusId: 1,
      createdAt: new Date('2024-01-15T00:00:00.000Z'),
      role: Role.Employee,
      status: EmployeeStatus.Active,
    },
    overrides,
  );
}

export function aCustomer(overrides: Partial<Customer> = {}): Customer {
  const customer = new Customer();

  return Object.assign(
    customer,
    {
      id: 1,
      tenantId: 1,
      name: 'Keangnam Landmark 72',
      companyName: 'Keangnam',
      contact: 'Chị Lan · 0912 345 678',
      address: 'Hà Nội',
      segmentId: 1,
      createdAt: new Date('2024-01-15T00:00:00.000Z'),
      segment: CustomerSegment.Regular,
    },
    overrides,
  );
}

export function aTeam(overrides: Partial<Team> = {}): Team {
  const team = new Team();

  return Object.assign(
    team,
    {
      id: 1,
      tenantId: 1,
      name: 'Tổ 1',
      code: 'T1',
      createdAt: new Date('2024-01-15T00:00:00.000Z'),
      members: [],
    },
    overrides,
  );
}

export function aTenant(overrides: Partial<Tenant> = {}): Tenant {
  const tenant = new Tenant();

  return Object.assign(
    tenant,
    {
      id: 1,
      name: 'Tenant',
      statusId: 1,
      createdAt: new Date('2024-01-15T00:00:00.000Z'),
      status: TenantStatus.Active,
    },
    overrides,
  );
}

export function anAccessContext(employee: Employee, overrides: Partial<AccessContext> = {}): AccessContext {
  const credential: TokenClaims = { jti: 'test-credential', iat: 0, exp: Number.MAX_SAFE_INTEGER };

  return {
    tenantId: employee.tenantId,
    employee,
    scope: RowScope.All,
    credential,
    ...overrides,
  };
}
