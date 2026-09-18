import { Injectable } from '@nestjs/common';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { AuthOutOfScopeException } from '../../models/domain-errors';
import { Shift } from '../../models/shifts/shift.entity';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { AccessContext } from '../access-control/access-context';
import { toShiftView } from './dispatch.service';
export interface DisputeCommand {
  reason: string;
  reportedVia?: 'phone' | 'in_person';
  reportedBy?: string;
  reportedAt?: Date;
  description?: string;
}
@Injectable()
export class DisputeService {
  constructor(private readonly shiftRepository: ShiftRepository) {}
  async mark(access: AccessContext, shiftId: number, command: DisputeCommand): Promise<ShiftView> {
    void command;
    const shift = await this.requireShift(access, shiftId);
    shift.dispute();
    return toShiftView(await this.shiftRepository.update(shift));
  }
  async resolve(access: AccessContext, shiftId: number): Promise<ShiftView> {
    const shift = await this.requireShift(access, shiftId);
    shift.resolveDispute();
    return toShiftView(await this.shiftRepository.update(shift));
  }
  private async requireShift(access: AccessContext, id: number): Promise<Shift> {
    const shift = await this.shiftRepository.findById(access.tenantId, id);
    if (shift === null) {
      throw new AuthOutOfScopeException();
    }
    return shift;
  }
}
