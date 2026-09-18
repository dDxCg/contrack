import 'reflect-metadata';
import { Alert } from '../../../models/alerts/alert.entity';
import { Contract } from '../../../models/contracts/contract.entity';
import { ContractItem } from '../../../models/contracts/contract-item.entity';
import { ContractSite } from '../../../models/contracts/contract-site.entity';
import { ContractCost } from '../../../models/contract-costs/contract-cost.entity';
import { Customer } from '../../../models/customers/customer.entity';
import { Employee } from '../../../models/employees/employee.entity';
import { PlatformAdmin } from '../../../models/platform/platform-admin.entity';
import { Shift } from '../../../models/shifts/shift.entity';
import { ShiftPhoto } from '../../../models/shifts/shift-photo.entity';
import { Statement } from '../../../models/statements/statement.entity';
import { Team } from '../../../models/teams/team.entity';
import { Tenant } from '../../../models/tenants/tenant.entity';
import { ENTITIES } from '../../../models/entities';
import { createDataSource } from '../../../data/db-context/data-source';
import { createTestDataSource } from '../../support/pg-mem-data-source';

const ALL_ENTITY_CLASSES = [
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
  PlatformAdmin,
];

describe('ENTITIES — one shared entity list for every data source', () => {
  it('registers every entity the repositories can reach, with no duplicates', () => {
    for (const entity of ALL_ENTITY_CLASSES) {
      expect(ENTITIES).toContain(entity);
    }
    expect(new Set(ENTITIES).size).toBe(ENTITIES.length);
  });
  it('createDataSource registers the shared list, not its own subset', () => {
    const dataSource = createDataSource({ DB_PORT: '5432' });
    expect(dataSource.options?.entities).toEqual([...ENTITIES]);
  });
  it('the pg-mem test harness registers the same entities the production data source does', async () => {
    const dataSource = await createTestDataSource();
    const productionDataSource = createDataSource({ DB_PORT: '5432' });
    const registered = (entity: new () => unknown): string | undefined =>
      dataSource.entityMetadatas.find((metadata) => metadata.target === entity)?.tableName;
    for (const entity of ENTITIES) {
      const tableName = registered(entity as new () => unknown);
      expect(tableName).toBeDefined();
      expect(productionDataSource.options?.entities).toContain(entity);
    }
    expect(dataSource.entityMetadatas).toHaveLength(ENTITIES.length);
  });
});
