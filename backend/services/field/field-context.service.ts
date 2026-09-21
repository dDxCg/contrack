import { Inject, Injectable } from '@nestjs/common';
import { FieldContextView } from '../../dtos/field/field.response.dto';
import { FieldTokenInvalidException } from '../../models/domain-errors';
import { ShiftStatus } from '../../models/shifts/shift.entity';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { FieldTokenService } from './field-token.service';
const ALL_EVIDENCE_STEPS = ['before_photo', 'after_photo', 'receipt_photo'] as const;
@Injectable()
export class FieldContextService {
  constructor(
    private readonly fieldTokenService: FieldTokenService,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
  ) {}
  async get(token: string): Promise<FieldContextView> {
    const claims = await this.fieldTokenService.verify(token);
    const shift = await this.shiftRepository.findByIdUnscoped(claims.shift_id);
    if (shift === null) {
      throw new FieldTokenInvalidException();
    }
    const context = await this.shiftRepository.fieldContextFor(shift.contractItemId);
    if (context === null) {
      throw new FieldTokenInvalidException();
    }
    const submitted = shift.status === ShiftStatus.Completed || shift.status === ShiftStatus.Disputed;
    return {
      contract_site: context.siteName,
      service_item: context.itemName,
      scheduled_at: shift.scheduledDate.toString(),
      remaining_steps: submitted ? [] : [...ALL_EVIDENCE_STEPS],
    };
  }
}
