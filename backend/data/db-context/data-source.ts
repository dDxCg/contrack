import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { ENTITIES } from '../../models/entities';

export const DATA_SOURCE = Symbol('DATA_SOURCE');

export function createDataSource(env: NodeJS.ProcessEnv = process.env): DataSource {
  return new DataSource({
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: readPositiveInt(env, 'DB_PORT', 5432),
    username: env.DB_USER ?? 'contrack',
    password: env.DB_PASSWORD ?? 'contrack',
    database: env.DB_NAME ?? 'contrack',
    entities: [...ENTITIES],
    migrations: [join(__dirname, '../../migrations/*.{ts,js}')],
    migrationsTableName: 'schema_migrations',
    synchronize: false,
    logging: false,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    extra: { max: readPositiveInt(env, 'DB_POOL_MAX', 10) },
  });
}

export default createDataSource(process.env);

function readPositiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];

  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number (got "${raw}")`);
  }

  return value;
}
