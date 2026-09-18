import { Injectable } from '@nestjs/common';
import { AuthCredentialExpiredException, AuthForbiddenRoleException } from '../../models/domain-errors';
import { PlatformAdminRepository } from '../../repositories/platform/platform-admin.repository';
import type { PlatformTokenPayload, TokenClaims } from '../auth/token.service';
import { AccessRequirement } from './access.decorator';
import { CredentialResolver } from './credential-resolver';
import { PlatformAccessContext } from './platform-access-context';
import { Resource } from './role-resolver';
const PLATFORM_RESOURCES: ReadonlySet<Resource> = new Set([Resource.Tenants, Resource.PlatformDashboard]);
@Injectable()
export class PlatformCredentialResolver implements CredentialResolver {
  readonly kind = 'platform';
  constructor(private readonly platformAdminRepository: PlatformAdminRepository) {}
  async resolve(claims: TokenClaims, requirement?: AccessRequirement): Promise<PlatformAccessContext> {
    const payload = claims as TokenClaims & Partial<PlatformTokenPayload>;
    if (typeof payload.sub !== 'number') {
      throw new AuthCredentialExpiredException();
    }
    if (requirement === undefined || !PLATFORM_RESOURCES.has(requirement.resource)) {
      throw new AuthForbiddenRoleException([]);
    }
    const platformAdmin = await this.platformAdminRepository.findById(payload.sub);
    if (platformAdmin === null) {
      throw new AuthCredentialExpiredException();
    }
    return { platformAdmin, credential: payload as PlatformTokenPayload };
  }
}
