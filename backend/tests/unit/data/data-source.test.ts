import { createDataSource } from '../../../data/db-context/data-source';

describe('createDataSource', () => {
  it('defaults to no SSL and a pool max of 10', () => {
    const dataSource = createDataSource({});
    expect(dataSource.options).toMatchObject({ ssl: false, extra: { max: 10 } });
  });

  it('enables SSL when DB_SSL=true', () => {
    const dataSource = createDataSource({ DB_SSL: 'true' });
    expect(dataSource.options).toMatchObject({ ssl: { rejectUnauthorized: true } });
  });

  it('reads a configured pool max', () => {
    const dataSource = createDataSource({ DB_POOL_MAX: '25' });
    expect(dataSource.options).toMatchObject({ extra: { max: 25 } });
  });

  it('rejects a non-numeric pool max', () => {
    expect(() => createDataSource({ DB_POOL_MAX: 'lots' })).toThrow(/DB_POOL_MAX/);
  });

  it('rejects a non-positive port', () => {
    expect(() => createDataSource({ DB_PORT: '0' })).toThrow(/DB_PORT/);
  });
});
