import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Tenant } from '../Models/tenant.entity';
import { DATA_SOURCE } from '../Data/DbContext/data-source';

@Injectable()
export class TenantRepository {
  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {}

  async findById(id: number): Promise<Tenant | null> {
    const row = await this.dataSource
      .createQueryBuilder(Tenant, 't')
      .innerJoin('tenant_statuses', 's', 's.id = t.status_id')
      .select([
        't.id AS id',
        't.name AS name',
        't.status_id AS status_id',
        't.created_at AS created_at',
        's.code AS status',
      ])
      .where('t.id = :id', { id })
      .getRawOne<TenantRow>();

    return row === undefined || row === null ? null : hydrateTenant(row);
  }
}

interface TenantRow {
  id: number;
  name: string;
  status_id: number;
  created_at: Date;
  status: Tenant['status'];
}

function hydrateTenant(row: TenantRow): Tenant {
  const tenant = new Tenant();
  tenant.id = row.id;
  tenant.name = row.name;
  tenant.statusId = row.status_id;
  tenant.createdAt = row.created_at;
  tenant.status = row.status;

  return tenant;
}
