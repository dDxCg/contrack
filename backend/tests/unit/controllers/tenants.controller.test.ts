import { TenantsController } from '../../../controllers/platform/tenants.controller';
import { TenantService } from '../../../services/platform/tenant.service';
import { TenantStatus } from '../../../models/tenants/tenant.entity';

describe('TenantsController', () => {
  it('list forwards status, limit and offset from the query', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0 });
    const controller = new TenantsController({ list } as unknown as TenantService);
    await controller.list({ status: TenantStatus.Active, limit: 25, offset: 0 });
    expect(list).toHaveBeenCalledWith({ status: TenantStatus.Active, limit: 25, offset: 0 });
  });
  it('create maps the body into a command', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new TenantsController({ create } as unknown as TenantService);
    await controller.create({
      name: 'Tenant A',
      director_email: 'director@example.com',
      director_password: 'secret',
    });
    expect(create).toHaveBeenCalledWith({
      name: 'Tenant A',
      directorEmail: 'director@example.com',
      directorPassword: 'secret',
    });
  });
  it('updateStatus forwards the id and the new status', async () => {
    const updateStatus = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new TenantsController({ updateStatus } as unknown as TenantService);
    await controller.updateStatus(9, { status: TenantStatus.Suspended });
    expect(updateStatus).toHaveBeenCalledWith(9, TenantStatus.Suspended);
  });
});
