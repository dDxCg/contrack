import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { FieldTokenExpiredException, FieldTokenInvalidException } from '../Models/domain-errors';
import { AUTH_CONFIG, AuthConfig } from './AccessControl/auth.config';

export interface FieldTokenClaims {
  readonly typ: 'field';
  readonly shift_id: number;
  readonly jti: string;
  readonly iat: number;
  readonly exp: number;
}

/** Per-shift signed link (D3) — no login, no tenant_id; the token itself is the whole authorization. */
@Injectable()
export class FieldTokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  get ttlSeconds(): number {
    return this.config.fieldTtlSeconds;
  }

  sign(shiftId: number): string {
    return this.jwt.sign(
      { shift_id: shiftId, typ: 'field', jti: randomUUID() },
      { expiresIn: this.config.fieldTtlSeconds },
    );
  }

  verify(raw: string): FieldTokenClaims {
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify<Record<string, unknown>>(raw);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new FieldTokenExpiredException();
      }
      throw new FieldTokenInvalidException();
    }

    const usable =
      payload.typ === 'field' &&
      typeof payload.shift_id === 'number' &&
      typeof payload.jti === 'string' &&
      typeof payload.exp === 'number' &&
      typeof payload.iat === 'number';

    if (!usable) {
      throw new FieldTokenInvalidException();
    }

    return payload as unknown as FieldTokenClaims;
  }
}
