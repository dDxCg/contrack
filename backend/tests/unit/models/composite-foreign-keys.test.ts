import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedTenant } from '../../support/seed';

describe('Composite tenant-scoped foreign keys (M4) — DB-level defence in depth', () => {
  it('rejects a contract_sites row that points at another tenant’s contract', async () => {
    const dataSource = await createTestDataSource();
    const tenantA = await seedTenant(dataSource, { name: 'Tenant A' });
    const tenantB = await seedTenant(dataSource, { name: 'Tenant B' });
    const chainA = await seedContractItemChain(dataSource, tenantA.id);
    await expect(
      dataSource.query(
        `INSERT INTO contract_sites (tenant_id, contract_id, name) VALUES ($1, $2, 'Cross-tenant site')`,
        [tenantB.id, chainA.contractId],
      ),
    ).rejects.toThrow();
  });
  it('rejects a shifts row whose contract_item belongs to another tenant', async () => {
    const dataSource = await createTestDataSource();
    const tenantA = await seedTenant(dataSource, { name: 'Tenant A' });
    const tenantB = await seedTenant(dataSource, { name: 'Tenant B' });
    const chainA = await seedContractItemChain(dataSource, tenantA.id);
    await expect(
      dataSource.query(
        `INSERT INTO shifts (tenant_id, contract_item_id, scheduled_date) VALUES ($1, $2, '2024-10-21')`,
        [tenantB.id, chainA.itemId],
      ),
    ).rejects.toThrow();
  });
  it('rejects an employees row assigned to a manager from another tenant', async () => {
    const dataSource = await createTestDataSource();
    const tenantA = await seedTenant(dataSource, { name: 'Tenant A' });
    const tenantB = await seedTenant(dataSource, { name: 'Tenant B' });
    const [role] = (await dataSource.query(`SELECT id FROM roles WHERE code = 'employee'`)) as {
      id: number;
    }[];
    const [managerA] = (await dataSource.query(
      `INSERT INTO employees (tenant_id, name, email, password_hash, role_id) VALUES ($1, 'Manager A', 'manager.a@example.com', 'x', $2) RETURNING id`,
      [tenantA.id, role.id],
    )) as {
      id: number;
    }[];
    await expect(
      dataSource.query(
        `INSERT INTO employees (tenant_id, name, email, password_hash, role_id, manager_id) VALUES ($1, 'Employee B', 'employee.b@example.com', 'x', $2, $3)`,
        [tenantB.id, role.id, managerA.id],
      ),
    ).rejects.toThrow();
  });
  it('still allows the ordinary same-tenant chain to be created', async () => {
    const dataSource = await createTestDataSource();
    const tenant = await seedTenant(dataSource);
    await expect(seedContractItemChain(dataSource, tenant.id)).resolves.toMatchObject({
      contractId: expect.any(Number),
      siteId: expect.any(Number),
      itemId: expect.any(Number),
    });
  });
});
