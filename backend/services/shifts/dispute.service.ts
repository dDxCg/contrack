import { Inject, Injectable } from '@nestjs/common';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { AuthForbiddenRoleException, AuthOutOfScopeException } from '../../models/domain-errors';
import { Role } from '../../models/employees/employee.entity';
import { Shift } from '../../models/shifts/shift.entity';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { AccessContext } from '../access-control/access-context';
import { CLOCK, IClock } from '../access-control/clock';
import { toShiftView } from '../../dtos/shifts/shifts.mapper';

const DISPUTE_ROLES: readonly Role[] = [Role.Manager, Role.Director];

export interface DisputeCommand {
  reason: string;
  reportedVia?: 'phone' | 'in_person';
  reportedBy?: string;
  reportedAt?: Date;
  description?: string;
}

@Injectable()
export class DisputeService {
  constructor(
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(CLOCK)
    private readonly clock: IClock,
  ) {}

  async mark(access: AccessContext, shiftId: number, command: DisputeCommand): Promise<ShiftView> {
    this.assertDisputeRole(access);
    const shift = await this.requireShift(access, shiftId);
    shift.dispute({
      reason: command.reason,
      reportedVia: command.reportedVia ?? null,
      reportedBy: command.reportedBy ?? null,
      reportedAt: command.reportedAt ?? this.clock.now(),
      description: command.description ?? null,
    });

    return toShiftView(await this.shiftRepository.update(shift));
  }

  async resolve(access: AccessContext, shiftId: number): Promise<ShiftView> {
    this.assertDisputeRole(access);
    const shift = await this.requireShift(access, shiftId);
    shift.resolveDispute();

    return toShiftView(await this.shiftRepository.update(shift));
  }

  private assertDisputeRole(access: AccessContext): void {
    if (!DISPUTE_ROLES.includes(access.employee.role)) {
      throw new AuthForbiddenRoleException(DISPUTE_ROLES);
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
