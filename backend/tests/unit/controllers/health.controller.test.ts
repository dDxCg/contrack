import { ServiceUnavailableException } from '@nestjs/common';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { HealthController } from '../../../controllers/health.controller';

function fakeDataSource(query: jest.Mock): DataSource {
  return { query } as unknown as DataSource;
}

function fakeRedis(ping: jest.Mock): Redis {
  return { ping } as unknown as Redis;
}

describe('HealthController', () => {
  it('live answers ok without touching the database', () => {
    const query = jest.fn();
    const controller = new HealthController(fakeDataSource(query), null);

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
  });

  it('ready answers ok and reports the in-memory fallback when Redis is not configured', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController(fakeDataSource(query), null);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok', redis: 'in-memory' },
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('ready answers ok and reports redis once it responds to a ping', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const ping = jest.fn().mockResolvedValue('PONG');
    const controller = new HealthController(fakeDataSource(query), fakeRedis(ping));

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok', redis: 'ok' },
    });
    expect(ping).toHaveBeenCalled();
  });

  it('ready answers 503 rather than ok when the database fails', async () => {
    const query = jest.fn().mockRejectedValue(new Error('connection refused'));
    const controller = new HealthController(fakeDataSource(query), null);

    const error = await controller.ready().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      status: 'error',
      checks: { database: 'down' },
    });
  });

  it('ready answers 503 rather than ok when Redis is configured but unreachable', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const ping = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const controller = new HealthController(fakeDataSource(query), fakeRedis(ping));

    const error = await controller.ready().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      status: 'error',
      checks: { database: 'ok', redis: 'down' },
    });
  });
});
