import { DataSource } from 'typeorm';
import { Tenant, TenantStatus } from '../../models/tenants/tenant.entity';

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

export async function seedContractItemChain(
  dataSource: DataSource,
  tenantId: number,
  overrides: { unitPrice?: number; signedAt?: string; expiresAt?: string } = {},
): Promise<{ contractId: number; siteId: number; itemId: number }> {
  const unitPrice = overrides.unitPrice ?? 100_000;
  const signedAt = overrides.signedAt ?? '2024-01-01';
  const expiresAt = overrides.expiresAt ?? '2025-12-31';

  const [customer] = (await dataSource.query(
    `INSERT INTO customers (tenant_id, name) VALUES ($1, 'Seed Customer') RETURNING id`,
    [tenantId],
  )) as { id: number }[];
  const [contract] = (await dataSource.query(
    `INSERT INTO contracts (tenant_id, customer_id, signed_at, expires_at) VALUES ($1, $2, $3, $4) RETURNING id`,
    [tenantId, customer.id, signedAt, expiresAt],
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
     VALUES ($1, $2, 'Seed Item', 1, $3, $4) RETURNING id`,
    [tenantId, site.id, weekUnit.id, unitPrice],
  )) as { id: number }[];

  return { contractId: contract.id, siteId: site.id, itemId: item.id };
}

export async function seedShift(
  dataSource: DataSource,
  params: {
    tenantId: number;
    contractItemId: number;
    assigneeId: number | null;
    scheduledDate: string;
    status?: string;
    completedAt?: string | null;
  },
): Promise<number> {
  const status = params.status ?? 'scheduled';
  const [statusRow] = (await dataSource.query(`SELECT id FROM shift_statuses WHERE code = $1`, [status])) as {
    id: number;
  }[];
  const completedAt =
    params.completedAt !== undefined
      ? params.completedAt
      : status === 'completed'
        ? params.scheduledDate
        : null;

  const [row] = (await dataSource.query(
    `INSERT INTO shifts (tenant_id, contract_item_id, assignee_id, scheduled_date, status_id, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      params.tenantId,
      params.contractItemId,
      params.assigneeId,
      params.scheduledDate,
      statusRow.id,
      completedAt,
    ],
  )) as { id: number }[];

  return row.id;
}
