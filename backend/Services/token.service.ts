import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AuthCredentialExpiredException } from '../Models/domain-errors';
import { Employee, Role } from '../Models/employee.entity';
import { AUTH_CONFIG, AuthConfig } from './AccessControl/auth.config';
import { CLOCK, IClock } from './AccessControl/clock';

type CredentialType = 'access' | 'refresh';

export interface TokenClaims {
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

@Injectable()
export class TokenService {
  private readonly revoked = new Map<string, number>();

  constructor(
    private readonly jwt: JwtService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @Inject(CLOCK) private readonly clock: IClock,
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

  verifyAccess(raw: string): AccessTokenPayload {
    return this.verify(raw, 'access') as unknown as AccessTokenPayload;
  }

  verifyRefresh(raw: string): RefreshTokenPayload {
    return this.verify(raw, 'refresh') as unknown as RefreshTokenPayload;
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

  private verify(raw: string, expectedType: CredentialType): TokenClaims & { typ: CredentialType } {
    try {
      const payload = this.jwt.verify<Record<string, unknown>>(raw);
      const usable =
        payload.typ === expectedType &&
        typeof payload.jti === 'string' &&
        typeof payload.exp === 'number' &&
        typeof payload.iat === 'number' &&
        typeof payload.sub === 'number' &&
        typeof payload.tenant_id === 'number' &&
        !this.isRevoked(payload.jti);

      if (!usable) {
        throw new Error('unusable credential');
      }

      return payload as unknown as TokenClaims & { typ: CredentialType; sub: number; tenant_id: number };
    } catch {
      throw new AuthCredentialExpiredException();
    }
  }
}
