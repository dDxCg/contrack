import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { ENTITIES } from '../../models/entities';
const SCHEMA_SQL = readFileSync(join(__dirname, '../../../docs/04-schema.sql'), 'utf8');
const openDataSources: DataSource[] = [];
afterEach(async () => {
  await Promise.all(openDataSources.splice(0).map((dataSource) => dataSource.destroy()));
});
export async function createTestDataSource(): Promise<DataSource> {
  const mem = newDb();
  mem.public.registerFunction({
    name: 'version',
    returns: 'text' as never,
    implementation: () => 'PostgreSQL 15.0 (pg-mem)',
  });
  mem.public.registerFunction({
    name: 'current_database',
    returns: 'text' as never,
    implementation: () => 'contrack_test',
  });
  mem.public.none(SCHEMA_SQL);
  const dataSource = mem.adapters.createTypeormDataSource({ type: 'postgres', entities: [...ENTITIES] });
  await dataSource.initialize();
  openDataSources.push(dataSource);
  return dataSource;
}
