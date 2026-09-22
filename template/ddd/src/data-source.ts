import { DataSource } from 'typeorm';
import { ContractOrmEntity } from './contexts/contracts/infrastructure/persistence/contract.orm-entity';
import { ContractSiteOrmEntity } from './contexts/contracts/infrastructure/persistence/contract-site.orm-entity';
import { ContractItemOrmEntity } from './contexts/contracts/infrastructure/persistence/contract-item.orm-entity';

export const DATA_SOURCE = Symbol('DATA_SOURCE');

export const ENTITIES = [ContractOrmEntity, ContractSiteOrmEntity, ContractItemOrmEntity];

/**
 * createDataSource — trimmed down from backend/data/db-context/data-source.ts.
 * Same postgres-driver shape and env var names, pointed only at the three
 * contracts-context entities this reference port actually has. `synchronize`
 * is left `false` by default, same as the original (this port has no
 * migrations directory — see README.md's "how you'd port the next module"
 * section for what a real migration setup would add).
 */
export function createDataSource(env: NodeJS.ProcessEnv = process.env): DataSource {
  return new DataSource({
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: readPositiveInt(env, 'DB_PORT', 5432),
    username: env.DB_USER ?? 'contrack',
    password: env.DB_PASSWORD ?? 'contrack',
    database: env.DB_NAME ?? 'contrack',
    entities: ENTITIES,
    synchronize: env.DB_SYNCHRONIZE === 'true',
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
