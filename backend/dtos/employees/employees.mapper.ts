import { Employee } from '../../models/employees/employee.entity';
import { EmployeeView } from './employees.response.dto';
export function toEmployeeView(employee: Employee): EmployeeView {
  return {
    id: employee.id,
    name: employee.name,
    contact: employee.contact,
    email: employee.email,
    role: employee.role,
    manager_id: employee.managerId,
    team_id: employee.teamId,
    status: employee.status,
  };
}
