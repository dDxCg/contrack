import { AccessContext } from '../../services/access-control/access-context';
import { RowScope } from '../../services/access-control/row-scope';
import { TokenClaims } from '../../services/auth/token.service';
import { Contract, ContractStatus } from '../../models/contracts/contract.entity';
import { ContractItem, FrequencyUnit } from '../../models/contracts/contract-item.entity';
import { ContractSite } from '../../models/contracts/contract-site.entity';
import { Customer, CustomerSegment } from '../../models/customers/customer.entity';
import { Employee, EmployeeStatus, Role } from '../../models/employees/employee.entity';
import { Team } from '../../models/teams/team.entity';
import { Tenant, TenantStatus } from '../../models/tenants/tenant.entity';
import { Money } from '../../utils/money';
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
export function aContract(overrides: Partial<Contract> = {}): Contract {
  const contract = new Contract();
  return Object.assign(
    contract,
    {
      id: 1,
      tenantId: 1,
      customerId: 1,
      signedAt: new Date('2024-01-01'),
      expiresAt: new Date('2024-12-31'),
      statusId: 1,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      status: ContractStatus.Active,
    },
    overrides,
  );
}
export function aContractSite(overrides: Partial<ContractSite> = {}): ContractSite {
  const site = new ContractSite();
  return Object.assign(
    site,
    {
      id: 1,
      tenantId: 1,
      contractId: 1,
      name: 'Toà A',
      workRequirements: null,
      notes: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    overrides,
  );
}
export function aContractItem(overrides: Partial<ContractItem> = {}): ContractItem {
  const item = new ContractItem();
  return Object.assign(
    item,
    {
      id: 1,
      tenantId: 1,
      siteId: 1,
      name: 'Vệ sinh sảnh',
      frequencyCount: 1,
      frequencyUnitId: 1,
      frequencyRule: null,
      dayOfWeek: null,
      dayOfMonth: null,
      unitPrice: Money.fromNumber(500000),
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      frequencyUnit: FrequencyUnit.Week,
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
      timezone: 'Asia/Ho_Chi_Minh',
      createdAt: new Date('2024-01-15T00:00:00.000Z'),
      status: TenantStatus.Active,
    },
    overrides,
  );
}
export function anAccessContext(employee: Employee, overrides: Partial<AccessContext> = {}): AccessContext {
  const credential: TokenClaims = {
    typ: 'access',
    jti: 'test-credential',
    iat: 0,
    exp: Number.MAX_SAFE_INTEGER,
  };
  return {
    tenantId: employee.tenantId,
    employee,
    scope: RowScope.All,
    credential,
    ...overrides,
  };
}
