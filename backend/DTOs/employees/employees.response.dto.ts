import { EmployeeStatus, Role } from '../../models/employees/employee.entity';

export interface EmployeeView {
  id: number;
  name: string;
  contact: string | null;
  email: string;
  role: Role;
  manager_id: number | null;
  team_id: number | null;
  status: EmployeeStatus;
}

export interface EmployeePage {
  items: EmployeeView[];
  total: number;
  limit: number;
  offset: number;
}
