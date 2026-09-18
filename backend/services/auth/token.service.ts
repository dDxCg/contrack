import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AuthCredentialExpiredException } from '../../models/domain-errors';
import { Employee, Role } from '../../models/employees/employee.entity';
import { PlatformAdmin } from '../../models/platform/platform-admin.entity';
import { AUTH_CONFIG, AuthConfig } from '../access-control/auth.config';
import { CLOCK, IClock } from '../access-control/clock';
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
@Injectable()
export class TokenService {
  private readonly revoked = new Map<string, number>();
  constructor(
    private readonly jwt: JwtService,
    @Inject(AUTH_CONFIG)
    private readonly config: AuthConfig,
    @Inject(CLOCK)
    private readonly clock: IClock,
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
  verifyAny(raw: string): TokenClaims {
    return this.verifyGeneric(raw);
  }
  verifyAccess(raw: string): AccessTokenPayload {
    const claims = this.verifyGeneric(raw);
    if (claims.typ !== 'access' || typeof claims.sub !== 'number' || typeof claims.tenant_id !== 'number') {
      throw new AuthCredentialExpiredException();
    }
    return claims as unknown as AccessTokenPayload;
  }
  verifyRefresh(raw: string): RefreshTokenPayload {
    const claims = this.verifyGeneric(raw);
    if (claims.typ !== 'refresh' || typeof claims.sub !== 'number' || typeof claims.tenant_id !== 'number') {
      throw new AuthCredentialExpiredException();
    }
    return claims as unknown as RefreshTokenPayload;
  }
  verifyPlatform(raw: string): PlatformTokenPayload {
    const claims = this.verifyGeneric(raw);
    if (claims.typ !== 'platform' || typeof claims.sub !== 'number') {
      throw new AuthCredentialExpiredException();
    }
    return claims as unknown as PlatformTokenPayload;
  }
  revoke(claims: TokenClaims): void {
    if (claims.exp * 1000 > this.clock.now().getTime()) {
      this.revoked.set(claims.jti, claims.exp);
    }
  }
  isRevoked(jti: string): boolean {
    const expiresAt = this.revoked.get(jti);
    if (expiresAt === undefined) {
      return false;
    }
    if (expiresAt * 1000 <= this.clock.now().getTime()) {
      this.revoked.delete(jti);
      return false;
    }
    return true;
  }
  private sign(payload: Record<string, unknown>, expiresInSeconds: number): string {
    return this.jwt.sign({ ...payload, jti: randomUUID() }, { expiresIn: expiresInSeconds });
  }
  private verifyGeneric(raw: string): Record<string, unknown> & TokenClaims {
    try {
      const payload = this.jwt.verify<Record<string, unknown>>(raw);
      const usable =
        typeof payload.typ === 'string' &&
        typeof payload.jti === 'string' &&
        typeof payload.exp === 'number' &&
        typeof payload.iat === 'number' &&
        !this.isRevoked(payload.jti);
      if (!usable) {
        throw new Error('unusable credential');
      }
      return payload as Record<string, unknown> & TokenClaims;
    } catch {
      throw new AuthCredentialExpiredException();
    }
  }
}
