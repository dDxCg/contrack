import { PlatformAdmin } from '../../models/platform/platform-admin.entity';
import type { TokenClaims } from '../auth/token.service';

export interface PlatformAccessContext {
  readonly platformAdmin: PlatformAdmin;
  readonly credential: TokenClaims;
}
