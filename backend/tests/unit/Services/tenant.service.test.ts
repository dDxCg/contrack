import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { TenantStatus } from '../../../models/tenants/tenant.entity';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { TenantRepository } from '../../../repositories/tenants/tenant.repository';
import { BcryptPasswordHasher } from '../../../services/auth/password-hasher.service';
import { TenantService } from '../../../services/platform/tenant.service';
async function world() {
  const dataSource = await createTestDataSource();
  const tenants = new TenantRepository(dataSource);
  const employees = new EmployeeRepository(dataSource);
  const service = new TenantService(tenants, employees, new BcryptPasswordHasher(4));
  return { service, tenants, employees };
}
describe('TenantService', () => {
  describe('create — FR19', () => {
    it('creates the tenant and its first Director in one call, both active', async () => {
      const { service, employees } = await world();
      const view = await service.create({
        name: 'Vệ sinh công nghiệp Thành Đạt',
        directorEmail: 'director@example.com',
        directorPassword: 'super-secret',
      });
      expect(view).toMatchObject({ name: 'Vệ sinh công nghiệp Thành Đạt', status: TenantStatus.Active });
      expect(view.director_employee_id).toBeDefined();
      const director = await employees.findByEmail('director@example.com');
      expect(director).toMatchObject({ tenantId: view.id, role: Role.Director });
      expect(director?.isActive()).toBe(true);
    });
    it('rejects a director email already used by an existing employee (globally unique)', async () => {
      const { service, tenants, employees } = await world();
      const otherTenant = await tenants.create('Existing Co');
      await seedDirector(employees, otherTenant.id, 'taken@example.com');
      const error = await captureDomainErrorAsync(() =>
        service.create({ name: 'New Co', directorEmail: 'taken@example.com', directorPassword: 'x' }),
      );
      expect(error.code).toBe('employee.email_taken');
    });
  });
  describe('list', () => {
    it('filters by status and paginates', async () => {
      const { service, tenants } = await world();
      await tenants.create('Active Co');
      const suspended = await tenants.create('Suspended Co');
      await tenants.updateStatus(suspended.id, TenantStatus.Suspended);
      const page = await service.list({ status: TenantStatus.Suspended, limit: 25, offset: 0 });
      expect(page.total).toBe(1);
      expect(page.items[0]).toMatchObject({ name: 'Suspended Co', status: TenantStatus.Suspended });
    });
  });
  describe('updateStatus — FR20', () => {
    it('suspends and reactivates a tenant', async () => {
      const { service, tenants } = await world();
      const tenant = await tenants.create('Toggle Co');
      const suspended = await service.updateStatus(tenant.id, TenantStatus.Suspended);
      expect(suspended.status).toBe(TenantStatus.Suspended);
      const reactivated = await service.updateStatus(tenant.id, TenantStatus.Active);
      expect(reactivated.status).toBe(TenantStatus.Active);
    });
    it('rejects an unknown tenant id', async () => {
      const { service } = await world();
      const error = await captureDomainErrorAsync(() => service.updateStatus(999999, TenantStatus.Suspended));
      expect(error.code).toBe('tenant.not_found');
    });
  });
});
async function seedDirector(employees: EmployeeRepository, tenantId: number, email: string): Promise<void> {
  const employee = new Employee();
  employee.tenantId = tenantId;
  employee.setName(email);
  employee.setContact(null);
  employee.email = email;
  employee.setRole(Role.Director);
  employee.setTeam(null);
  employee.setManager(null);
  employee.status = EmployeeStatus.Active;
  employee.setPasswordHash('x');
  await employees.create(employee);
}
