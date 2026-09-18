import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Employee, EmployeeStatus, Role } from '../../models/employees/employee.entity';
import { Page, PageOf, TenantScopedRepository } from '../tenant-scoped.repository';

const MAX_MANAGER_CHAIN = 100;

@Injectable()
export class EmployeeRepository extends TenantScopedRepository<Employee> {
  protected override readonly entity: EntityTarget<Employee> = Employee;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    super(dataSource);
  }

  async list(tenantId: number, page: Page): Promise<PageOf<Employee>> {
    const rows = await this.selected(tenantId)
      .orderBy('e.id', 'ASC')
      .limit(page.limit)
      .offset(page.offset)
      .getRawMany<EmployeeRow>();
    const total = await this.scopedTo(tenantId, 'e').getCount();

    return { items: rows.map(hydrateEmployee), total };
  }

  async findById(tenantId: number, id: number): Promise<Employee | null> {
    const row = await this.selected(tenantId).andWhere('e.id = :id', { id }).getRawOne<EmployeeRow>();

    return row === undefined || row === null ? null : hydrateEmployee(row);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const row = await this.withColumns(this.unscopedTo('e'))
      .andWhere('e.email = :email', { email })
      .getRawOne<EmployeeRow>();

    return row === undefined || row === null ? null : hydrateEmployee(row);
  }

  async existsEmail(email: string): Promise<boolean> {
    const count = await this.unscopedTo('e').andWhere('e.email = :email', { email }).getCount();

    return count > 0;
  }

  async findByTeamIds(tenantId: number, teamIds: readonly number[]): Promise<Employee[]> {
    if (teamIds.length === 0) {
      return [];
    }

    const rows = await this.selected(tenantId)
      .andWhere('e.team_id IN (:...teamIds)', { teamIds: [...teamIds] })
      .orderBy('e.id', 'ASC')
      .getRawMany<EmployeeRow>();

    return rows.map(hydrateEmployee);
  }

  async managerChainOf(tenantId: number, employeeId: number): Promise<number[]> {
    const chain: number[] = [];
    let current: number | null = employeeId;

    while (current !== null && chain.length < MAX_MANAGER_CHAIN) {
      chain.push(current);
      const manager = await this.dataSource
        .getRepository(Employee)
        .findOne({ where: { id: current, tenantId }, select: { managerId: true } });
      current = manager?.managerId ?? null;
    }

    return chain;
  }

  async create(employee: Employee): Promise<Employee> {
    await this.resolveLookups(employee);

    return this.saveAndReload(employee);
  }

  async update(employee: Employee): Promise<Employee> {
    await this.resolveLookups(employee);

    return this.saveAndReload(employee);
  }

  async futureShiftIdsFor(tenantId: number, employeeId: number): Promise<number[]> {
    const rows = await this.scopedIds('shifts', tenantId, 's')
      .andWhere('s.assignee_id = :employeeId', { employeeId })
      .andWhere('s.scheduled_date >= CURRENT_DATE')
      .andWhere('s.completed_at IS NULL')
      .orderBy('s.id', 'ASC')
      .getRawMany<{ id: number }>();

    return rows.map((row) => row.id);
  }

  private selected(tenantId: number): SelectQueryBuilder<Employee> {
    return this.withColumns(this.scopedTo(tenantId, 'e'));
  }

  private withColumns(query: SelectQueryBuilder<Employee>): SelectQueryBuilder<Employee> {
    return query
      .innerJoin('roles', 'r', 'r.id = e.role_id')
      .innerJoin('employee_statuses', 's', 's.id = e.status_id')
      .select([
        'e.id AS id',
        'e.tenant_id AS tenant_id',
        'e.name AS name',
        'e.contact AS contact',
        'e.email AS email',
        'e.password_hash AS password_hash',
        'e.manager_id AS manager_id',
        'e.team_id AS team_id',
        'e.role_id AS role_id',
        'e.status_id AS status_id',
        'e.created_at AS created_at',
        'r.code AS role',
        's.code AS status',
      ]);
  }

  private async resolveLookups(employee: Employee): Promise<void> {
    employee.roleId = await this.lookupId('roles', employee.role);
    employee.statusId = await this.lookupId('employee_statuses', employee.status);
  }

  private async saveAndReload(employee: Employee): Promise<Employee> {
    const saved = await this.dataSource.getRepository(Employee).save(employee);
    const reloaded = await this.findById(saved.tenantId, saved.id);

    if (reloaded === null) {
      throw new Error(`employees row ${saved.id} disappeared right after it was written`);
    }

    return reloaded;
  }
}

interface EmployeeRow {
  id: number;
  tenant_id: number;
  name: string;
  contact: string | null;
  email: string;
  password_hash: string | null;
  manager_id: number | null;
  team_id: number | null;
  role_id: number;
  status_id: number;
  created_at: Date;
  role: Role;
  status: EmployeeStatus;
}

function hydrateEmployee(row: EmployeeRow): Employee {
  const employee = new Employee();
  employee.id = row.id;
  employee.tenantId = row.tenant_id;
  employee.name = row.name;
  employee.contact = row.contact;
  employee.email = row.email;
  employee.passwordHash = row.password_hash;
  employee.managerId = row.manager_id;
  employee.teamId = row.team_id;
  employee.roleId = row.role_id;
  employee.statusId = row.status_id;
  employee.createdAt = row.created_at;
  employee.role = row.role;
  employee.status = row.status;

  return employee;
}
