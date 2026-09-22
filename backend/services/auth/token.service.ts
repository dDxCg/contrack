import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AuthCredentialExpiredException } from '../../models/domain-errors';
import { Employee, Role } from '../../models/employees/employee.entity';
import { PlatformAdmin } from '../../models/platform/platform-admin.entity';
import { AUTH_CONFIG, AuthConfig } from '../access-control/auth.config';
import { REVOCATION_STORE, RevocationStore } from './revocation-store';

export interface TokenClaims {
  readonly typ: string;
  readonly jti: string;
  readonly iat: number;
  readonly exp: number;
}

export interface AccessTokenPayload extends TokenClaims {
  readonly typ: 'access';
  readonly sub: number;
  readonly tenant_id: number;
  readonly role: Role;
}

export interface RefreshTokenPayload extends TokenClaims {
  readonly typ: 'refresh';
  readonly sub: number;
  readonly tenant_id: number;
}

export interface PlatformTokenPayload extends TokenClaims {
  readonly typ: 'platform';
  readonly sub: number;
}

function isAccessTokenPayload(claims: TokenClaims): claims is AccessTokenPayload {
  const candidate = claims as Partial<AccessTokenPayload>;

  return (
    candidate.typ === 'access' && typeof candidate.sub === 'number' && typeof candidate.tenant_id === 'number'
  );
}

function isRefreshTokenPayload(claims: TokenClaims): claims is RefreshTokenPayload {
  const candidate = claims as Partial<RefreshTokenPayload>;

  return (
    candidate.typ === 'refresh' &&
    typeof candidate.sub === 'number' &&
    typeof candidate.tenant_id === 'number'
  );
}

function isPlatformTokenPayload(claims: TokenClaims): claims is PlatformTokenPayload {
  const candidate = claims as Partial<PlatformTokenPayload>;

  return candidate.typ === 'platform' && typeof candidate.sub === 'number';
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(AUTH_CONFIG)
    private readonly config: AuthConfig,
    @Inject(REVOCATION_STORE)
    private readonly revocations: RevocationStore,
  ) {}

  get accessTtlSeconds(): number {
    return this.config.accessTtlSeconds;
  }

  get refreshTtlSeconds(): number {
    return this.config.refreshTtlSeconds;
  }

  signAccess(employee: Employee): string {
    return this.sign(
      { sub: employee.id, tenant_id: employee.tenantId, role: employee.role, typ: 'access' },
      this.accessTtlSeconds,
    );
  }

  signRefresh(employee: Employee): string {
    return this.sign(
      { sub: employee.id, tenant_id: employee.tenantId, typ: 'refresh' },
      this.refreshTtlSeconds,
    );
  }

  signPlatform(admin: PlatformAdmin): string {
    return this.sign({ sub: admin.id, typ: 'platform' }, this.accessTtlSeconds);
  }

  async verifyAny(raw: string): Promise<TokenClaims> {
    return this.verifyGeneric(raw);
  }

  async verifyAccess(raw: string): Promise<AccessTokenPayload> {
    const claims = await this.verifyGeneric(raw);

    if (!isAccessTokenPayload(claims)) {
      throw new AuthCredentialExpiredException();
    }

    return claims;
  }

  async verifyRefresh(raw: string): Promise<RefreshTokenPayload> {
    const claims = await this.verifyGeneric(raw);

    if (!isRefreshTokenPayload(claims)) {
      throw new AuthCredentialExpiredException();
    }

    return claims;
  }

  async verifyPlatform(raw: string): Promise<PlatformTokenPayload> {
    const claims = await this.verifyGeneric(raw);

    if (!isPlatformTokenPayload(claims)) {
      throw new AuthCredentialExpiredException();
    }

    return claims;
  }

  async revoke(claims: TokenClaims): Promise<void> {
    await this.revocations.revoke(claims.jti, claims.exp);
  }

  async isRevoked(jti: string): Promise<boolean> {
    return this.revocations.isRevoked(jti);
  }

  private sign(payload: Record<string, unknown>, expiresInSeconds: number): string {
    return this.jwt.sign({ ...payload, jti: randomUUID() }, { expiresIn: expiresInSeconds });
  }

  private async verifyGeneric(raw: string): Promise<Record<string, unknown> & TokenClaims> {
    try {
      const payload = this.jwt.verify<Record<string, unknown>>(raw);
      const structurallyUsable =
        typeof payload.typ === 'string' &&
        typeof payload.jti === 'string' &&
        typeof payload.exp === 'number' &&
        typeof payload.iat === 'number';

      if (!structurallyUsable || (await this.isRevoked(payload.jti as string))) {
        throw new Error('unusable credential');
      }

      return payload as Record<string, unknown> & TokenClaims;
    } catch {
      throw new AuthCredentialExpiredException();
    }
  }
}
