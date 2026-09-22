import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { CLOCK, IClock } from '../access-control/clock';

export interface RevocationStore {
  revoke(jti: string, expiresAtEpochSeconds: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

export const REVOCATION_STORE = Symbol('REVOCATION_STORE');

@Injectable()
export class InMemoryRevocationStore implements RevocationStore {
  private readonly revoked = new Map<string, number>();

  constructor(
    @Inject(CLOCK)
    private readonly clock: IClock,
  ) {}

  async revoke(jti: string, expiresAtEpochSeconds: number): Promise<void> {
    if (expiresAtEpochSeconds * 1000 > this.clock.now().getTime()) {
      this.revoked.set(jti, expiresAtEpochSeconds);
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
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
}

const REVOCATION_KEY_PREFIX = 'revoked:';

@Injectable()
export class RedisRevocationStore implements RevocationStore {
  constructor(
    private readonly redis: Redis,
    @Inject(CLOCK)
    private readonly clock: IClock,
  ) {}

  async revoke(jti: string, expiresAtEpochSeconds: number): Promise<void> {
    const ttlSeconds = expiresAtEpochSeconds - Math.floor(this.clock.now().getTime() / 1000);

    if (ttlSeconds > 0) {
      await this.redis.set(`${REVOCATION_KEY_PREFIX}${jti}`, '1', 'EX', ttlSeconds);
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    return (await this.redis.exists(`${REVOCATION_KEY_PREFIX}${jti}`)) === 1;
  }
}
