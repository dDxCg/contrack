import { Inject, Injectable } from '@nestjs/common';
import { TenantPage, TenantView } from '../../dtos/platform/platform.response.dto';
import { EmployeeEmailTakenException, TenantNotFoundException } from '../../models/domain-errors';
import { Employee, EmployeeStatus, Role } from '../../models/employees/employee.entity';
import { Tenant, TenantStatus } from '../../models/tenants/tenant.entity';
import { EmployeeRepository } from '../../repositories/employees/employee.repository';
import { TenantListQuery, TenantRepository } from '../../repositories/tenants/tenant.repository';
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
    private readonly employeeRepository: EmployeeRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}
  async create(command: TenantCreateCommand): Promise<TenantView> {
    if (await this.employeeRepository.existsEmail(command.directorEmail)) {
      throw new EmployeeEmailTakenException(command.directorEmail);
    }
    const tenant = await this.tenantRepository.create(command.name);
    const director = new Employee();
    director.tenantId = tenant.id;
    director.setName(command.directorEmail);
    director.setContact(null);
    director.email = command.directorEmail;
    director.setRole(Role.Director);
    director.setTeam(null);
    director.setManager(null);
    director.status = EmployeeStatus.Active;
    director.setPasswordHash(await this.passwordHasher.hash(command.directorPassword));
    const savedDirector = await this.employeeRepository.create(director);
    return toTenantView(tenant, savedDirector.id);
  }
  async list(query: TenantListQuery): Promise<TenantPage> {
    const { items, total } = await this.tenantRepository.list(query);
    return {
      items: items.map((tenant) => toTenantView(tenant)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
  async updateStatus(id: number, status: TenantStatus): Promise<TenantView> {
    const existing = await this.tenantRepository.findById(id);
    if (existing === null) {
      throw new TenantNotFoundException(id);
    }
    return toTenantView(await this.tenantRepository.updateStatus(id, status));
  }
}
function toTenantView(tenant: Tenant, directorEmployeeId?: number): TenantView {
  return {
    id: tenant.id,
    name: tenant.name,
    status: tenant.status,
    created_at: tenant.createdAt,
    ...(directorEmployeeId === undefined ? {} : { director_employee_id: directorEmployeeId }),
  };
}
