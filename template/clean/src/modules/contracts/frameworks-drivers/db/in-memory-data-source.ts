import { newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { CONTRACTS_ENTITIES } from './data-source';

// Test-only helper: a real TypeORM DataSource backed by pg-mem (pure JS, no
// native build tools, already a devDependency in backend/) instead of a real
// PostgreSQL server. Used by the frameworks-drivers repository integration
// tests to prove the TypeORM gateway implementations actually satisfy the
// use-case-owned repository interfaces end to end, with `synchronize: true`
// so no migration/seed step is needed.
export async function createInMemoryDataSource(): Promise<DataSource> {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'contrack_test',
  });
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 14.0',
  });
  const dataSource: DataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: CONTRACTS_ENTITIES,
    synchronize: true,
  });
  await dataSource.initialize();
  return dataSource;
}
