import { Inject, Injectable } from '@nestjs/common';
import { PlatformSessionView } from '../../dtos/platform/platform.response.dto';
import { AuthInvalidCredentialsException } from '../../models/domain-errors';
import {
  IPlatformAdminRepository,
  PlatformAdminRepository,
} from '../../repositories/platform/platform-admin.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../auth/password-hasher.service';
import { TokenService } from '../auth/token.service';

export interface PlatformLoginCommand {
  username: string;
  password: string;
}

@Injectable()
export class PlatformAuthService {
  constructor(
    @Inject(PlatformAdminRepository)
    private readonly platformAdminRepository: IPlatformAdminRepository,
    private readonly tokenService: TokenService,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async login(command: PlatformLoginCommand): Promise<PlatformSessionView> {
    const admin = await this.platformAdminRepository.findByUsername(command.username);

    if (admin === null || !(await this.passwordHasher.verify(command.password, admin.passwordHash))) {
      throw new AuthInvalidCredentialsException();
    }

    return {
      token: this.tokenService.signPlatform(admin),
      platform_admin: { id: admin.id, name: admin.name },
    };
  }
}
