import { Injectable } from '@nestjs/common';
import { AuthOutOfScopeException } from '../Models/domain-errors';
import { Shift } from '../Models/shift.entity';
import { ShiftRepository } from '../Repositories/shift.repository';
import { AccessContext } from './AccessControl/access-context';
import { ShiftView, toShiftView } from './dispatch.service';

/**
 * `reason`/`reported_via`/`reported_by`/`description` are accepted from the caller per
 * `05-api.yaml`'s dispute request body, but `04-schema.sql` has no columns to persist a
 * dispute reason yet — only the shift's own status transitions. Tracked as a follow-up.
 */
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
