import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import {
  FieldTokenAlreadyUsedException,
  FieldTokenExpiredException,
  FieldTokenInvalidException,
} from '../../models/domain-errors';
import { AUTH_CONFIG, AuthConfig } from '../access-control/auth.config';
import { REVOCATION_STORE, RevocationStore } from '../auth/revocation-store';
export interface FieldTokenClaims {
  readonly typ: 'field';
  readonly shift_id: number;
  readonly jti: string;
  readonly iat: number;
  readonly exp: number;
}
function isFieldTokenClaims(
  payload: Record<string, unknown>,
): payload is Record<string, unknown> & FieldTokenClaims {
  return (
    payload.typ === 'field' &&
    typeof payload.shift_id === 'number' &&
    typeof payload.jti === 'string' &&
    typeof payload.exp === 'number' &&
    typeof payload.iat === 'number'
  );
}
@Injectable()
export class FieldTokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(AUTH_CONFIG)
    private readonly config: AuthConfig,
    @Inject(REVOCATION_STORE)
    private readonly revocations: RevocationStore,
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
  async verify(raw: string): Promise<FieldTokenClaims> {
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify<Record<string, unknown>>(raw);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new FieldTokenExpiredException();
      }
      throw new FieldTokenInvalidException();
    }
    if (!isFieldTokenClaims(payload)) {
      throw new FieldTokenInvalidException();
    }
    if (await this.revocations.isRevoked(payload.jti)) {
      throw new FieldTokenAlreadyUsedException();
    }
    return payload;
  }
  async markUsed(claims: FieldTokenClaims): Promise<void> {
    await this.revocations.revoke(claims.jti, claims.exp);
  }
}
