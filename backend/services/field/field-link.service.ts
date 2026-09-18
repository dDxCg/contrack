import { Inject, Injectable } from '@nestjs/common';
import { FieldLinkView } from '../../dtos/field/field.response.dto';
import { AuthOutOfScopeException } from '../../models/domain-errors';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { AccessContext } from '../access-control/access-context';
import { CLOCK, IClock } from '../access-control/clock';
import { FieldTokenService } from './field-token.service';
@Injectable()
export class FieldLinkService {
  constructor(
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    private readonly fieldTokenService: FieldTokenService,
    @Inject(CLOCK)
    private readonly clock: IClock,
  ) {}
  async issue(access: AccessContext, shiftId: number): Promise<FieldLinkView> {
    const shift = await this.shiftRepository.findById(access.tenantId, shiftId);
    if (shift === null) {
      throw new AuthOutOfScopeException();
    }
    const token = this.fieldTokenService.sign(shift.id);
    const expiresAt = new Date(this.clock.now().getTime() + this.fieldTokenService.ttlSeconds * 1000);
    return {
      token,
      url: `${process.env.APP_BASE_URL ?? ''}/field#${token}`,
      expires_at: expiresAt.toISOString(),
    };
  }
}
