import { Injectable } from '@nestjs/common';
import type { AccessTokenPayload } from '../auth/token.service';

@Injectable()
export class TenantResolver {
  fromCredential(credential: Pick<AccessTokenPayload, 'tenant_id'>): number {
    return credential.tenant_id;
  }
}
