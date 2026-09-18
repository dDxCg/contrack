import { EmployeeStatus, Role } from '../../models/employees/employee.entity';
import { PageView } from '../page.dto';
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
export type EmployeePage = PageView<EmployeeView>;
