import { DataSource } from 'typeorm';
import { Customer } from '../../Models/customer.entity';
import { Employee } from '../../Models/employee.entity';
import { Team } from '../../Models/team.entity';
import { Tenant } from '../../Models/tenant.entity';
import { CustomerRepository } from '../../Repositories/customer.repository';
import { EmployeeRepository } from '../../Repositories/employee.repository';
import { TeamRepository } from '../../Repositories/team.repository';
import { TenantRepository } from '../../Repositories/tenant.repository';

const UNUSED_DATA_SOURCE = undefined as unknown as DataSource;

export interface Page {
  limit: number;
  offset: number;
}

function copy<T extends object>(row: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(row)) as T, row);
}

export class InMemoryDb {
  readonly tenants: Tenant[] = [];
  readonly customers: Customer[] = [];
  readonly employees: Employee[] = [];
  readonly teams: Team[] = [];
  readonly activeContracts = new Map<number, number[]>();
  readonly futureShifts = new Map<number, number[]>();

  private readonly sequences = new Map<string, number>();

  nextId(collection: string): number {
    const next = (this.sequences.get(collection) ?? 0) + 1;
    this.sequences.set(collection, next);
    return next;
  }
}

export class InMemoryTenantRepository extends TenantRepository {
  constructor(private readonly db: InMemoryDb) {
    super(UNUSED_DATA_SOURCE);
  }

  override async findById(id: number): Promise<Tenant | null> {
    const row = this.db.tenants.find((tenant) => tenant.id === id) ?? null;

    return row === null ? null : copy(row);
  }
}

export class InMemoryCustomerRepository extends CustomerRepository {
  constructor(private readonly db: InMemoryDb) {
    super(UNUSED_DATA_SOURCE);
  }

  override async list(tenantId: number, page: Page): Promise<{ items: Customer[]; total: number }> {
    const rows = this.db.customers.filter((customer) => customer.tenantId === tenantId);

    return { items: rows.slice(page.offset, page.offset + page.limit), total: rows.length };
  }

  override async findById(tenantId: number, id: number): Promise<Customer | null> {
    const row = this.db.customers.find((customer) => customer.tenantId === tenantId && customer.id === id) ?? null;

    return row === null ? null : copy(row);
  }

  override async create(customer: Customer): Promise<Customer> {
    customer.id = this.db.nextId('customers');
    customer.createdAt = new Date();
    this.db.customers.push(customer);

    return customer;
  }

  override async update(customer: Customer): Promise<Customer> {
    const index = this.db.customers.findIndex(
      (row) => row.tenantId === customer.tenantId && row.id === customer.id,
    );
    if (index >= 0) {
      this.db.customers[index] = customer;
    }

    return customer;
  }

  override async delete(tenantId: number, id: number): Promise<void> {
    const index = this.db.customers.findIndex((row) => row.tenantId === tenantId && row.id === id);
    if (index >= 0) {
      this.db.customers.splice(index, 1);
    }
  }

  override async activeContractIds(tenantId: number, customerId: number): Promise<number[]> {
    const owns = this.db.customers.some((row) => row.tenantId === tenantId && row.id === customerId);

    return owns ? (this.db.activeContracts.get(customerId) ?? []) : [];
  }
}

export class InMemoryEmployeeRepository extends EmployeeRepository {
  constructor(private readonly db: InMemoryDb) {
    super(UNUSED_DATA_SOURCE);
  }

  override async list(tenantId: number, page: Page): Promise<{ items: Employee[]; total: number }> {
    const rows = this.db.employees.filter((employee) => employee.tenantId === tenantId);

    return { items: rows.slice(page.offset, page.offset + page.limit), total: rows.length };
  }

  override async findById(tenantId: number, id: number): Promise<Employee | null> {
    const row = this.db.employees.find((employee) => employee.tenantId === tenantId && employee.id === id) ?? null;

    return row === null ? null : copy(row);
  }

  override async findByEmail(email: string): Promise<Employee | null> {
    const row = this.db.employees.find((employee) => employee.email === email) ?? null;

    return row === null ? null : copy(row);
  }

  override async existsEmail(email: string): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }

  override async create(employee: Employee): Promise<Employee> {
    employee.id = this.db.nextId('employees');
    this.db.employees.push(employee);

    return employee;
  }

  override async update(employee: Employee): Promise<Employee> {
    const index = this.db.employees.findIndex((row) => row.tenantId === employee.tenantId && row.id === employee.id);
    if (index >= 0) {
      this.db.employees[index] = employee;
    }

    return employee;
  }

  override async delete(tenantId: number, id: number): Promise<void> {
    const index = this.db.employees.findIndex((row) => row.tenantId === tenantId && row.id === id);
    if (index >= 0) {
      this.db.employees.splice(index, 1);
    }
  }

  override async findByTeamIds(tenantId: number, teamIds: readonly number[]): Promise<Employee[]> {
    return this.db.employees
      .filter(
        (employee) =>
          employee.tenantId === tenantId && employee.teamId !== null && teamIds.includes(employee.teamId),
      )
      .map(copy);
  }

  override async managerChainOf(tenantId: number, employeeId: number): Promise<number[]> {
    const chain: number[] = [];
    let current: number | null = employeeId;

    while (current !== null && chain.length < 100) {
      chain.push(current);
      const manager = this.db.employees.find(
        (employee) => employee.tenantId === tenantId && employee.id === current,
      );
      current = manager?.managerId ?? null;
    }

    return chain;
  }

  override async futureShiftIdsFor(tenantId: number, employeeId: number): Promise<number[]> {
    const owns = this.db.employees.some((row) => row.tenantId === tenantId && row.id === employeeId);

    return owns ? (this.db.futureShifts.get(employeeId) ?? []) : [];
  }
}

export class InMemoryTeamRepository extends TeamRepository {
  constructor(private readonly db: InMemoryDb) {
    super(UNUSED_DATA_SOURCE);
  }

  override async list(tenantId: number, options: { teamId?: number } = {}): Promise<Team[]> {
    return this.db.teams
      .filter(
        (team) => team.tenantId === tenantId && (options.teamId === undefined || team.id === options.teamId),
      )
      .map(copy);
  }

  override async findById(tenantId: number, id: number): Promise<Team | null> {
    const row = this.db.teams.find((team) => team.tenantId === tenantId && team.id === id) ?? null;

    return row === null ? null : copy(row);
  }

  override async existsCode(tenantId: number, code: string): Promise<boolean> {
    return this.db.teams.some((team) => team.tenantId === tenantId && team.code === code);
  }

  override async create(team: Team): Promise<Team> {
    team.id = this.db.nextId('teams');
    this.db.teams.push(team);

    return team;
  }

  override async update(team: Team): Promise<Team> {
    const index = this.db.teams.findIndex((row) => row.tenantId === team.tenantId && row.id === team.id);
    if (index >= 0) {
      this.db.teams[index] = team;
    }

    return team;
  }

  override async delete(tenantId: number, id: number): Promise<void> {
    const index = this.db.teams.findIndex((row) => row.tenantId === tenantId && row.id === id);
    if (index >= 0) {
      this.db.teams.splice(index, 1);
    }
  }
}
