import { Inject, Injectable } from '@nestjs/common';
import { AuthOutOfScopeException, EmployeeEmailTakenException } from '../Models/domain-errors';
import { Employee, EmployeeStatus, Role } from '../Models/employee.entity';
import { EmployeeRepository } from '../Repositories/employee.repository';
import { Page } from '../Repositories/tenant-scoped.repository';
import { TeamRepository } from '../Repositories/team.repository';
import { AccessContext } from './AccessControl/access-context';
import { PASSWORD_HASHER, PasswordHasher } from './password-hasher.service';

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

export interface EmployeeCommand {
  name: string;
  contact?: string | null;
  email: string;
  
  password?: string;
  role: Role;
  managerId?: number | null;
  teamId?: number | null;
}

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly teamRepository: TeamRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async list(access: AccessContext, page: Page): Promise<EmployeePage> {
    const { items, total } = await this.employeeRepository.list(access.tenantId, page);

    return { items: items.map(toEmployeeView), total, limit: page.limit, offset: page.offset };
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
    employee.rename(command.name);
    employee.setContact(command.contact ?? null);
    employee.email = command.email;
    employee.changeRole(command.role);
    employee.assignTeam(command.teamId ?? null);
    employee.assignManager(command.managerId ?? null);
    employee.status = EmployeeStatus.Active;

    await this.assertTeamLeadAllowed(access, employee);
    employee.setPasswordHash(await this.passwordHasher.hash(command.password ?? command.email));

    return toEmployeeView(await this.employeeRepository.create(employee));
  }

  async update(access: AccessContext, id: number, command: EmployeeCommand): Promise<EmployeeView> {
    const employee = await this.requireEmployee(access, id);

    if (command.email !== employee.email && (await this.employeeRepository.existsEmail(command.email))) {
      throw new EmployeeEmailTakenException(command.email);
    }

    employee.email = command.email;
    employee.rename(command.name);
    employee.setContact(command.contact ?? null);
    employee.changeRole(command.role);
    employee.assignTeam(command.teamId ?? null);

    const managerId = command.managerId ?? null;
    employee.assignManager(
      managerId,
      managerId === null ? [] : await this.employeeRepository.managerChainOf(access.tenantId, managerId),
    );

    await this.assertTeamLeadAllowed(access, employee);

    if (command.password !== undefined) {
      employee.setPasswordHash(await this.passwordHasher.hash(command.password));
    }

    return toEmployeeView(await this.employeeRepository.update(employee));
  }

  async delete(access: AccessContext, id: number): Promise<void> {
    const employee = await this.requireEmployee(access, id);
    employee.assertDeletable(await this.employeeRepository.futureShiftIdsFor(access.tenantId, id));

    await this.employeeRepository.delete(access.tenantId, id);
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
    team
      .withMembers(members.filter((member) => member.id !== candidate.id))
      .addMember(candidate);
  }

  private async requireEmployee(access: AccessContext, id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findById(access.tenantId, id);
    if (employee === null) {
      throw new AuthOutOfScopeException();
    }

    return employee;
  }
}

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
