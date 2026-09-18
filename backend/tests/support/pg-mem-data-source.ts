import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { Alert } from '../../models/alerts/alert.entity';
import { Contract } from '../../models/contracts/contract.entity';
import { ContractCost } from '../../models/contract-costs/contract-cost.entity';
import { ContractItem } from '../../models/contracts/contract-item.entity';
import { ContractSite } from '../../models/contracts/contract-site.entity';
import { Customer } from '../../models/customers/customer.entity';
import { Employee } from '../../models/employees/employee.entity';
import { ShiftPhoto } from '../../models/shifts/shift-photo.entity';
import { Shift } from '../../models/shifts/shift.entity';
import { Statement } from '../../models/statements/statement.entity';
import { Team } from '../../models/teams/team.entity';
import { Tenant } from '../../models/tenants/tenant.entity';

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
  Alert,
];
const SCHEMA_SQL = readFileSync(join(__dirname, '../../../docs/04-schema.sql'), 'utf8');

const openDataSources: DataSource[] = [];

// Registered once per test file that imports this module — closes every DataSource `world()`
// opened during the test that just ran, so pg-mem's connections never leak past it.
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

  const dataSource = mem.adapters.createTypeormDataSource({ type: 'postgres', entities: ENTITIES });
  await dataSource.initialize();
  openDataSources.push(dataSource);

  return dataSource;
}
