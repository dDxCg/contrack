import { anAccessContext, anEmployee } from '../../support/builders';
import { EmployeesController } from '../../../controllers/employees/employees.controller';
import { EmployeeService } from '../../../services/employees/employee.service';
import { Role, EmployeeStatus } from '../../../models/employees/employee.entity';
describe('EmployeesController', () => {
  const access = anAccessContext(anEmployee());
  it('list forwards the page window', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0 });
    const controller = new EmployeesController({ list } as unknown as EmployeeService);
    await controller.list(access, { limit: 25, offset: 0 });
    expect(list).toHaveBeenCalledWith(access, { limit: 25, offset: 0 });
  });
  it('create maps the body into a command', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new EmployeesController({ create } as unknown as EmployeeService);
    await controller.create(access, {
      name: 'Mai',
      email: 'mai@example.com',
      password: 'secret',
      role: Role.Employee,
    } as never);
    expect(create).toHaveBeenCalledWith(access, {
      name: 'Mai',
      contact: null,
      email: 'mai@example.com',
      password: 'secret',
      role: Role.Employee,
      managerId: null,
      teamId: null,
      status: undefined,
    });
  });
  it('get forwards the id', async () => {
    const get = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new EmployeesController({ get } as unknown as EmployeeService);
    await controller.get(access, 9);
    expect(get).toHaveBeenCalledWith(access, 9);
  });
  it('update maps the body into a command', async () => {
    const update = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new EmployeesController({ update } as unknown as EmployeeService);
    await controller.update(access, 9, {
      name: 'Mai',
      email: 'mai@example.com',
      role: Role.Manager,
      status: EmployeeStatus.Active,
    } as never);
    expect(update).toHaveBeenCalledWith(access, 9, {
      name: 'Mai',
      contact: null,
      email: 'mai@example.com',
      password: undefined,
      role: Role.Manager,
      managerId: null,
      teamId: null,
      status: EmployeeStatus.Active,
    });
  });
  it('deactivate forwards the id', async () => {
    const deactivate = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new EmployeesController({ deactivate } as unknown as EmployeeService);
    await controller.deactivate(access, 9);
    expect(deactivate).toHaveBeenCalledWith(access, 9);
  });
});
