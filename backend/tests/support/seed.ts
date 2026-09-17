import { DataSource } from 'typeorm';
import { Tenant, TenantStatus } from '../../Models/tenant.entity';

/**
 * `tenants` has no repository `create()` (M1 never needed one) — seed it with a direct insert
 * and hydrate the same way `TenantRepository.findById` does.
 */
export async function seedTenant(
  dataSource: DataSource,
  overrides: { name?: string; status?: TenantStatus } = {},
): Promise<Tenant> {
  const name = overrides.name ?? 'Tenant';
  const status = overrides.status ?? TenantStatus.Active;

  const [statusRow] = (await dataSource.query('SELECT id FROM tenant_statuses WHERE code = $1', [
    status,
  ])) as {
    id: number;
  }[];
  const [row] = (await dataSource.query(
    'INSERT INTO tenants (name, status_id) VALUES ($1, $2) RETURNING id, created_at',
    [name, statusRow.id],
  )) as { id: number; created_at: Date }[];

  const tenant = new Tenant();
  tenant.id = row.id;
  tenant.name = name;
  tenant.statusId = statusRow.id;
  tenant.createdAt = row.created_at;
  tenant.status = status;

  return tenant;
}

/** Minimal customer → contract → site → item chain, for tests that only need a valid FK to hang a shift off. */
export async function seedContractItemChain(
  dataSource: DataSource,
  tenantId: number,
): Promise<{ contractId: number; siteId: number; itemId: number }> {
  const [customer] = (await dataSource.query(
    `INSERT INTO customers (tenant_id, name) VALUES ($1, 'Seed Customer') RETURNING id`,
    [tenantId],
  )) as { id: number }[];
  const [contract] = (await dataSource.query(
    `INSERT INTO contracts (tenant_id, customer_id, signed_at, expires_at) VALUES ($1, $2, '2024-01-01', '2025-12-31') RETURNING id`,
    [tenantId, customer.id],
  )) as { id: number }[];
  const [site] = (await dataSource.query(
    `INSERT INTO contract_sites (tenant_id, contract_id, name) VALUES ($1, $2, 'Seed Site') RETURNING id`,
    [tenantId, contract.id],
  )) as { id: number }[];
  const [weekUnit] = (await dataSource.query(`SELECT id FROM frequency_units WHERE code = 'week'`)) as {
    id: number;
  }[];
  const [item] = (await dataSource.query(
    `INSERT INTO contract_items (tenant_id, site_id, name, frequency_count, frequency_unit_id, unit_price)
     VALUES ($1, $2, 'Seed Item', 1, $3, 100000) RETURNING id`,
    [tenantId, site.id, weekUnit.id],
  )) as { id: number }[];

  return { contractId: contract.id, siteId: site.id, itemId: item.id };
}

export async function seedShift(
  dataSource: DataSource,
  params: { tenantId: number; contractItemId: number; assigneeId: number; scheduledDate: string },
): Promise<number> {
  const [scheduled] = (await dataSource.query(`SELECT id FROM shift_statuses WHERE code = 'scheduled'`)) as {
    id: number;
  }[];
  const [row] = (await dataSource.query(
    `INSERT INTO shifts (tenant_id, contract_item_id, assignee_id, scheduled_date, status_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [params.tenantId, params.contractItemId, params.assigneeId, params.scheduledDate, scheduled.id],
  )) as { id: number }[];

  return row.id;
}
