import { DataSource } from 'typeorm';
import { ContractItemOrmEntity } from '../orm/contract-item.orm-entity';
import { ContractSiteOrmEntity } from '../orm/contract-site.orm-entity';
import { ContractOrmEntity } from '../orm/contract.orm-entity';

export const DATA_SOURCE = Symbol('DATA_SOURCE');

export const CONTRACTS_ENTITIES = [ContractOrmEntity, ContractSiteOrmEntity, ContractItemOrmEntity];

// Mirrors backend/data/db-context/data-source.ts's shape and env var names,
// trimmed to just the contracts module's entities.
export function createDataSource(env: NodeJS.ProcessEnv = process.env): DataSource {
  return new DataSource({
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: readPositiveInt(env, 'DB_PORT', 5432),
    username: env.DB_USER ?? 'contrack',
    password: env.DB_PASSWORD ?? 'contrack',
    database: env.DB_NAME ?? 'contrack',
    entities: CONTRACTS_ENTITIES,
    synchronize: false,
    logging: false,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  });
}

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
