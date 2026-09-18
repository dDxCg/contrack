import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { Contract } from '../../Models/contract.entity';
import { ContractCost } from '../../Models/contract-cost.entity';
import { ContractItem } from '../../Models/contract-item.entity';
import { ContractSite } from '../../Models/contract-site.entity';
import { Customer } from '../../Models/customer.entity';
import { Employee } from '../../Models/employee.entity';
import { ShiftPhoto } from '../../Models/shift-photo.entity';
import { Shift } from '../../Models/shift.entity';
import { Statement } from '../../Models/statement.entity';
import { Team } from '../../Models/team.entity';
import { Tenant } from '../../Models/tenant.entity';

const ENTITIES = [
  Tenant,
  Customer,
  Employee,
  Team,
  Contract,
  ContractSite,
  ContractItem,
  Shift,
  ShiftPhoto,
  Statement,
  ContractCost,
];
const SCHEMA_SQL = readFileSync(join(__dirname, '../../../docs/04-schema.sql'), 'utf8');

const openDataSources: DataSource[] = [];

// Registered once per test file that imports this module — closes every DataSource `world()`
// opened during the test that just ran, so pg-mem's connections never leak past it.
afterEach(async () => {
  await Promise.all(openDataSources.splice(0).map((dataSource) => dataSource.destroy()));
});

/**
 * A real TypeORM DataSource backed by pg-mem — 04-schema.sql loaded unmodified, repository code
 * under test runs completely unchanged. `version()`/`current_database()` are stubbed because
 * TypeORM's postgres driver calls them while connecting and pg-mem implements neither.
 */
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

  const dataSource = mem.adapters.createTypeormDataSource({ type: 'postgres', entities: ENTITIES });
  await dataSource.initialize();
  openDataSources.push(dataSource);

  return dataSource;
}
