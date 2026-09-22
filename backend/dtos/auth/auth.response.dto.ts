import { Role } from '../../models/employees/employee.entity';

export interface SessionEmployeeView {
  id: number;
  tenant_id: number;
  name: string;
  role: Role;
}

export interface SessionView {
  token: string;
  refresh_token: string;
  expires_in: number;
  employee: SessionEmployeeView;
}
