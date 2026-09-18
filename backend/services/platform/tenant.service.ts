import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantPage, TenantView } from '../../dtos/platform/platform.response.dto';
import { toTenantView } from '../../dtos/platform/platform.mapper';
import { pageOf } from '../../dtos/page.dto';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { EmployeeEmailTakenException, TenantNotFoundException } from '../../models/domain-errors';
import { Employee, EmployeeStatus, Role } from '../../models/employees/employee.entity';
import { TenantStatus } from '../../models/tenants/tenant.entity';
import { EmployeeRepository, IEmployeeRepository } from '../../repositories/employees/employee.repository';
import { TenantListQuery, TenantRepository } from '../../repositories/tenants/tenant.repository';
import { withUniqueViolation } from '../../repositories/unique-violation';
import { PASSWORD_HASHER, PasswordHasher } from '../auth/password-hasher.service';
export interface TenantCreateCommand {
  name: string;
  directorEmail: string;
  directorPassword: string;
}
@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}
  async create(command: TenantCreateCommand): Promise<TenantView> {
    if (await this.employeeRepository.existsEmail(command.directorEmail)) {
      throw new EmployeeEmailTakenException(command.directorEmail);
    }
    const passwordHash = await this.passwordHasher.hash(command.directorPassword);
    return this.dataSource.transaction(async (tx) => {
      const tenant = await this.tenantRepository.create(command.name, tx);
      const director = new Employee();
      director.tenantId = tenant.id;
      director.setName(command.directorEmail);
      director.setContact(null);
      director.email = command.directorEmail;
      director.setRole(Role.Director);
      director.setTeam(null);
      director.setManager(null);
      director.status = EmployeeStatus.Active;
      director.setPasswordHash(passwordHash);
      const savedDirector = await withUniqueViolation(
        () => this.employeeRepository.create(director, tx),
        () => new EmployeeEmailTakenException(command.directorEmail),
      );
      return toTenantView(tenant, savedDirector.id);
    });
  }
  async list(query: TenantListQuery): Promise<TenantPage> {
    const { items, total } = await this.tenantRepository.list(query);
    return pageOf(
      items.map((tenant) => toTenantView(tenant)),
      total,
      query,
    );
  }
  async updateStatus(id: number, status: TenantStatus): Promise<TenantView> {
    const existing = await this.tenantRepository.findById(id);
    if (existing === null) {
      throw new TenantNotFoundException(id);
    }
    return toTenantView(await this.tenantRepository.updateStatus(id, status));
  }
}
