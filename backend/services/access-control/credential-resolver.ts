import type { TokenClaims } from '../auth/token.service';
import { AccessContext } from './access-context';
import { AccessRequirement } from './access.decorator';
import { PlatformAccessContext } from './platform-access-context';

export const CREDENTIAL_RESOLVERS = Symbol('CREDENTIAL_RESOLVERS');

export type ResolvedAccess = AccessContext | PlatformAccessContext;

export interface CredentialResolver {
  readonly kind: string;
  resolve(claims: TokenClaims, requirement?: AccessRequirement): Promise<ResolvedAccess>;
}
