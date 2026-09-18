import { Injectable } from '@nestjs/common';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { AuthOutOfScopeException, ShiftAssigneeOutOfTeamException } from '../../models/domain-errors';
import { Shift } from '../../models/shifts/shift.entity';
import { EmployeeRepository } from '../../repositories/employees/employee.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { AccessContext } from '../access-control/access-context';
import { RowScope } from '../access-control/row-scope';

export interface ReassignCommand {
  assigneeId: number | null;
  scheduledDate?: Date;
}

@Injectable()
export class DispatchService {
  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async reassign(access: AccessContext, shiftId: number, command: ReassignCommand): Promise<ShiftView> {
    const shift = await this.requireShift(access, shiftId);

    if (command.assigneeId !== null) {
      await this.assertAssigneeAllowed(access, command.assigneeId);
    }

    shift.reassign(command.assigneeId, command.scheduledDate);

    return toShiftView(await this.shiftRepository.update(shift));
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

export function toShiftView(shift: Shift): ShiftView {
  return {
    id: shift.id,
    contract_item_id: shift.contractItemId,
    assignee_id: shift.assigneeId,
    scheduled_date: shift.scheduledDate.toString(),
    completed_at: shift.completedAt === null ? null : shift.completedAt.toString(),
    status: shift.status,
    latitude: shift.latitude,
    longitude: shift.longitude,
    captured_at: shift.capturedAt === null ? null : shift.capturedAt.toString(),
    receipt_photo_url: shift.receiptPhotoUrl,
  };
}
