import { Tenant } from '../../models/tenants/tenant.entity';
import { TenantView } from './platform.response.dto';

export function toTenantView(tenant: Tenant, directorEmployeeId?: number): TenantView {
  return {
    id: tenant.id,
    name: tenant.name,
    status: tenant.status,
    created_at: tenant.createdAt,
    ...(directorEmployeeId === undefined ? {} : { director_employee_id: directorEmployeeId }),
  };
}
