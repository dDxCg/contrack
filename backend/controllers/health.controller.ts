import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../data/db-context/data-source';
import { REDIS_CLIENT } from '../data/redis-client';
import { Public } from '../services/access-control/access.decorator';

export interface HealthStatus {
  status: 'ok';
}

export type RedisCheck = 'ok' | 'in-memory' | 'down';

export interface ReadyStatus {
  status: 'ok';
  checks: {
    database: 'ok';
    redis: RedisCheck;
  };
}

@Controller()
export class HealthController {
  constructor(
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  @Public()
  @Get('healthz')
  live(): HealthStatus {
    return { status: 'ok' };
  }

  @Public()
  @Get('readyz')
  async ready(): Promise<ReadyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: 'down', redis: await this.checkRedis() },
      });
    }
    const redis = await this.checkRedis();
    if (redis === 'down') {
      throw new ServiceUnavailableException({ status: 'error', checks: { database: 'ok', redis } });
    }
    return { status: 'ok', checks: { database: 'ok', redis } };
  }

  private async checkRedis(): Promise<RedisCheck> {
    if (this.redis === null) {
      return 'in-memory';
    }
    try {
      await this.redis.ping();
      return 'ok';
    } catch {
      return 'down';
    }
  }
}
