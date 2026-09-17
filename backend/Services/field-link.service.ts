import { Inject, Injectable } from '@nestjs/common';
import { AuthOutOfScopeException } from '../Models/domain-errors';
import { ShiftRepository } from '../Repositories/shift.repository';
import { AccessContext } from './AccessControl/access-context';
import { CLOCK, IClock } from './AccessControl/clock';
import { FieldTokenService } from './field-token.service';

export interface FieldLinkView {
  token: string;
  url: string;
  expires_at: string;
}

@Injectable()
export class FieldLinkService {
  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly fieldTokenService: FieldTokenService,
    @Inject(CLOCK) private readonly clock: IClock,
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
      url: `${process.env.APP_BASE_URL ?? ''}/field/${token}`,
      expires_at: expiresAt.toISOString(),
    };
  }
}
