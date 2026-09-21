import { Inject, Injectable } from '@nestjs/common';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { toShiftView } from '../../dtos/shifts/shifts.mapper';
import {
  AuthForbiddenRoleException,
  AuthOutOfScopeException,
  ShiftAssigneeOutOfTeamException,
} from '../../models/domain-errors';
import { Role } from '../../models/employees/employee.entity';
import { Shift } from '../../models/shifts/shift.entity';
import { EmployeeRepository, IEmployeeRepository } from '../../repositories/employees/employee.repository';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { AccessContext } from '../access-control/access-context';
import { RowScope } from '../access-control/row-scope';
const TEAM_ASSIGN_ROLES: readonly Role[] = [Role.Manager, Role.Director];
export interface ReassignCommand {
  assigneeId: number | null;
  scheduledDate?: Date;
}
@Injectable()
export class DispatchService {
  constructor(
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
  ) {}
  async reassign(access: AccessContext, shiftId: number, command: ReassignCommand): Promise<ShiftView> {
    if (access.employee.role !== Role.TeamLead) {
      throw new AuthForbiddenRoleException([Role.TeamLead]);
    }
    const shift = await this.requireShift(access, shiftId);
    this.assertShiftBelongsToCallerTeam(access, shift);
    if (command.assigneeId !== null) {
      await this.assertAssigneeAllowed(access, command.assigneeId);
    }
    shift.reassign(command.assigneeId, command.scheduledDate);
    return toShiftView(await this.shiftRepository.update(shift));
  }
  async assignTeam(access: AccessContext, shiftId: number, teamId: number | null): Promise<ShiftView> {
    if (!TEAM_ASSIGN_ROLES.includes(access.employee.role)) {
      throw new AuthForbiddenRoleException(TEAM_ASSIGN_ROLES);
    }
    const shift = await this.requireShift(access, shiftId);
    shift.assignTeam(teamId);
    return toShiftView(await this.shiftRepository.update(shift));
  }
  private assertShiftBelongsToCallerTeam(access: AccessContext, shift: Shift): void {
    if (shift.teamId === null || shift.teamId !== access.employee.teamId) {
      throw new AuthOutOfScopeException();
    }
  }
  private async assertAssigneeAllowed(access: AccessContext, assigneeId: number): Promise<void> {
    if (access.scope !== RowScope.Team) {
      return;
    }
    const assignee = await this.employeeRepository.findById(access.tenantId, assigneeId);
    if (assignee === null || assignee.teamId !== access.employee.teamId) {
      throw new ShiftAssigneeOutOfTeamException(assigneeId);
    }
  }
  private async requireShift(access: AccessContext, id: number): Promise<Shift> {
    const shift = await this.shiftRepository.findById(access.tenantId, id);
    if (shift === null) {
      throw new AuthOutOfScopeException();
    }
    return shift;
  }
}
