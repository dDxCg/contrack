import { DataSource } from 'typeorm';
import { HealthController } from '../../../controllers/health.controller';

function fakeDataSource(query: jest.Mock): DataSource {
  return { query } as unknown as DataSource;
}

describe('HealthController', () => {
  it('live answers ok without touching the database', () => {
    const query = jest.fn();
    const controller = new HealthController(fakeDataSource(query));

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
  });

  it('ready answers ok once the database responds', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController(fakeDataSource(query));

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('ready propagates a database failure rather than answering ok', async () => {
    const query = jest.fn().mockRejectedValue(new Error('connection refused'));
    const controller = new HealthController(fakeDataSource(query));

    await expect(controller.ready()).rejects.toThrow('connection refused');
  });
});
