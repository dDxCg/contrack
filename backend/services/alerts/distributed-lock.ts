import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { IClock } from '../access-control/clock';

export interface DistributedLock {
  tryAcquire(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

export const DISTRIBUTED_LOCK = Symbol('DISTRIBUTED_LOCK');

@Injectable()
export class InMemoryDistributedLock implements DistributedLock {
  private readonly grants = new Map<string, { value: string; expiresAt: number }>();
  constructor(private readonly clock: IClock) {}
  async tryAcquire(key: string, ttlSeconds: number): Promise<boolean> {
    const now = this.clock.now().getTime();
    const held = this.grants.get(key);
    if (held !== undefined && held.expiresAt > now) {
      return false;
    }
    this.grants.set(key, { value: `lock-${now}`, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }
  async release(key: string): Promise<void> {
    this.grants.delete(key);
  }
}

@Injectable()
export class RedisDistributedLock implements DistributedLock {
  constructor(private readonly redis: Redis) {}
  async tryAcquire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, this.ownerId, 'PX', ttlSeconds * 1000, 'NX');
    return result === 'OK';
  }
  async release(key: string): Promise<void> {
    await this.redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      this.ownerId,
    );
  }
  private get ownerId(): string {
    return `lock-owner-${this.token}`;
  }
  private readonly token = randomUUID();
}
