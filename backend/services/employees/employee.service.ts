import { Inject, Injectable } from '@nestjs/common';
import { EmployeeView, EmployeePage } from '../../dtos/employees/employees.response.dto';
import { toEmployeeView } from '../../dtos/employees/employees.mapper';
import { pageOf } from '../../dtos/page.dto';
import { AuthOutOfScopeException, EmployeeEmailTakenException } from '../../models/domain-errors';
import { Employee, EmployeeStatus, Role } from '../../models/employees/employee.entity';
import { EmployeeRepository, IEmployeeRepository } from '../../repositories/employees/employee.repository';
import { Page } from '../../repositories/tenant-scoped.repository';
import { TeamRepository } from '../../repositories/teams/team.repository';
import { withUniqueViolation } from '../../repositories/unique-violation';
import { AccessContext } from '../access-control/access-context';
import { PASSWORD_HASHER, PasswordHasher } from '../auth/password-hasher.service';
export interface EmployeeCommand {
  name: string;
  contact?: string | null;
  email: string;
  password?: string;
  role: Role;
  managerId?: number | null;
  teamId?: number | null;
  status?: EmployeeStatus;
}
@Injectable()
export class EmployeeService {
  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    private readonly teamRepository: TeamRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}
  async list(access: AccessContext, page: Page): Promise<EmployeePage> {
    const { items, total } = await this.employeeRepository.list(access.tenantId, page);
    return pageOf(items.map(toEmployeeView), total, page);
  }
  async get(access: AccessContext, id: number): Promise<EmployeeView> {
    return toEmployeeView(await this.requireEmployee(access, id));
  }
  async create(access: AccessContext, command: EmployeeCommand): Promise<EmployeeView> {
    if (await this.employeeRepository.existsEmail(command.email)) {
      throw new EmployeeEmailTakenException(command.email);
    }
    const employee = new Employee();
    employee.tenantId = access.tenantId;
    employee.setName(command.name);
    employee.setContact(command.contact ?? null);
    employee.email = command.email;
    employee.setRole(command.role);
    employee.setTeam(command.teamId ?? null);
    employee.setManager(command.managerId ?? null);
    employee.status = EmployeeStatus.Active;
    await this.assertTeamLeadAllowed(access, employee);
    employee.setPasswordHash(await this.passwordHasher.hash(command.password ?? command.email));
    const saved = await withUniqueViolation(
      () => this.employeeRepository.create(employee),
      () => new EmployeeEmailTakenException(command.email),
    );
    return toEmployeeView(saved);
  }
  async update(access: AccessContext, id: number, command: EmployeeCommand): Promise<EmployeeView> {
    const employee = await this.requireEmployee(access, id);
    if (command.email !== employee.email && (await this.employeeRepository.existsEmail(command.email))) {
      throw new EmployeeEmailTakenException(command.email);
    }
    employee.email = command.email;
    employee.setName(command.name);
    employee.setContact(command.contact ?? null);
    employee.setRole(command.role);
    employee.setTeam(command.teamId ?? null);
    const managerId = command.managerId ?? null;
    employee.setManager(
      managerId,
      managerId === null ? [] : await this.employeeRepository.managerChainOf(access.tenantId, managerId),
    );
    await this.assertTeamLeadAllowed(access, employee);
    if (command.password !== undefined) {
      employee.setPasswordHash(await this.passwordHasher.hash(command.password));
    }
    if (command.status !== undefined) {
      employee.setStatus(command.status);
    }
    const saved = await withUniqueViolation(
      () => this.employeeRepository.update(employee),
      () => new EmployeeEmailTakenException(command.email),
    );
    return toEmployeeView(saved);
  }
  async deactivate(access: AccessContext, id: number): Promise<EmployeeView> {
    const employee = await this.requireEmployee(access, id);
    employee.deactivate(await this.employeeRepository.futureShiftIdsFor(access.tenantId, id));
    return toEmployeeView(await this.employeeRepository.update(employee));
  }
  private async assertTeamLeadAllowed(access: AccessContext, candidate: Employee): Promise<void> {
    if (candidate.role !== Role.TeamLead || candidate.teamId === null) {
      return;
    }
    const team = await this.teamRepository.findById(access.tenantId, candidate.teamId);
    if (team === null) {
      throw new AuthOutOfScopeException();
    }
    const members = await this.employeeRepository.findByTeamIds(access.tenantId, [candidate.teamId]);
    team.setMembers(members.filter((member) => member.id !== candidate.id)).addMember(candidate);
  }
  private async requireEmployee(access: AccessContext, id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findById(access.tenantId, id);
    if (employee === null) {
      throw new AuthOutOfScopeException();
    }
    return employee;
  }
}
