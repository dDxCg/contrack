import { DataSource } from 'typeorm';
import { DataSourceShutdownService } from '../../../data/db-context/data-source-shutdown.service';

function fakeLogger(): { info: jest.Mock } {
  return { info: jest.fn() };
}

describe('DataSourceShutdownService', () => {
  it('destroys the data source on application shutdown when it is initialized', async () => {
    const dataSource = {
      isInitialized: true,
      destroy: jest.fn().mockResolvedValue(undefined),
    } as unknown as DataSource;
    const service = new DataSourceShutdownService(dataSource, fakeLogger() as never);

    await service.onApplicationShutdown();

    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the data source was never initialized', async () => {
    const dataSource = { isInitialized: false, destroy: jest.fn() } as unknown as DataSource;
    const service = new DataSourceShutdownService(dataSource, fakeLogger() as never);

    await service.onApplicationShutdown();

    expect(dataSource.destroy).not.toHaveBeenCalled();
  });
});
