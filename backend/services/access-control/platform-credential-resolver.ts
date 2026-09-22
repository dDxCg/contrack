import { Inject, Injectable } from '@nestjs/common';
import { AuthCredentialExpiredException, AuthForbiddenRoleException } from '../../models/domain-errors';
import {
  IPlatformAdminRepository,
  PlatformAdminRepository,
} from '../../repositories/platform/platform-admin.repository';
import type { TokenClaims } from '../auth/token.service';
import { AccessRequirement } from './access.decorator';
import { CredentialResolver } from './credential-resolver';
import { PlatformAccessContext } from './platform-access-context';
import { Resource } from './role-resolver';

const PLATFORM_RESOURCES: ReadonlySet<Resource> = new Set([Resource.Tenants, Resource.PlatformDashboard]);
interface PlatformTokenClaims extends TokenClaims {
  readonly sub: number;
}

function isPlatformTokenClaims(claims: TokenClaims): claims is PlatformTokenClaims {
  return typeof (claims as Partial<PlatformTokenClaims>).sub === 'number';
}

@Injectable()
export class PlatformCredentialResolver implements CredentialResolver {
  readonly kind = 'platform';

  constructor(
    @Inject(PlatformAdminRepository)
    private readonly platformAdminRepository: IPlatformAdminRepository,
  ) {}

  async resolve(claims: TokenClaims, requirement?: AccessRequirement): Promise<PlatformAccessContext> {
    if (!isPlatformTokenClaims(claims)) {
      throw new AuthCredentialExpiredException();
    }

    if (requirement === undefined || !PLATFORM_RESOURCES.has(requirement.resource)) {
      throw new AuthForbiddenRoleException([]);
    }

    const platformAdmin = await this.platformAdminRepository.findById(claims.sub);

    if (platformAdmin === null) {
      throw new AuthCredentialExpiredException();
    }

    return { platformAdmin, credential: claims };
  }
}
