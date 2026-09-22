import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Tenant, TenantStatus } from '../../models/tenants/tenant.entity';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { PageOf } from '../tenant-scoped.repository';

export interface TenantListQuery {
  status?: TenantStatus;
  limit: number;
  offset: number;
}

export interface ITenantRepository {
  findById(id: number, tx?: EntityManager): Promise<Tenant | null>;
  create(name: string, tx?: EntityManager): Promise<Tenant>;
  updateStatus(id: number, status: TenantStatus): Promise<Tenant>;
  list(query: TenantListQuery): Promise<PageOf<Tenant>>;
  listRecent(limit: number): Promise<Tenant[]>;
  countAll(): Promise<number>;
  countByStatus(status: TenantStatus): Promise<number>;
  countCreatedBetween(from: Date, to: Date): Promise<number>;
  activeIds(): Promise<number[]>;
  timezoneOf(id: number): Promise<string>;
}

@Injectable()
export class TenantRepository implements ITenantRepository {
  constructor(
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number, tx?: EntityManager): Promise<Tenant | null> {
    const row = await this.selected(tx).andWhere('t.id = :id', { id }).getRawOne<TenantRow>();

    return row === undefined || row === null ? null : hydrateTenant(row);
  }

  async create(name: string, tx?: EntityManager): Promise<Tenant> {
    const statusId = await this.lookupStatusId(TenantStatus.Active, tx);
    const saved = await (tx ?? this.dataSource.manager)
      .getRepository(Tenant)
      .save(Object.assign(new Tenant(), { name, statusId }));

    return this.requireById(saved.id, tx);
  }

  async updateStatus(id: number, status: TenantStatus): Promise<Tenant> {
    const statusId = await this.lookupStatusId(status);
    await this.dataSource.getRepository(Tenant).update({ id }, { statusId });

    return this.requireById(id);
  }

  async list(query: TenantListQuery): Promise<PageOf<Tenant>> {
    let selection = this.selected();
    let counted = this.dataSource
      .createQueryBuilder(Tenant, 't')
      .innerJoin('tenant_statuses', 's', 's.id = t.status_id');

    if (query.status !== undefined) {
      selection = selection.andWhere('s.code = :status', { status: query.status });
      counted = counted.andWhere('s.code = :status', { status: query.status });
    }

    const [rows, total] = await Promise.all([
      selection.orderBy('t.id', 'ASC').limit(query.limit).offset(query.offset).getRawMany<TenantRow>(),
      counted.getCount(),
    ]);

    return { items: rows.map(hydrateTenant), total };
  }

  async listRecent(limit: number): Promise<Tenant[]> {
    const rows = await this.selected().orderBy('t.created_at', 'DESC').limit(limit).getRawMany<TenantRow>();

    return rows.map(hydrateTenant);
  }

  async countAll(): Promise<number> {
    return this.dataSource.createQueryBuilder(Tenant, 't').getCount();
  }

  async countByStatus(status: TenantStatus): Promise<number> {
    return this.dataSource
      .createQueryBuilder(Tenant, 't')
      .innerJoin('tenant_statuses', 's', 's.id = t.status_id')
      .andWhere('s.code = :status', { status })
      .getCount();
  }

  async countCreatedBetween(from: Date, to: Date): Promise<number> {
    return this.dataSource
      .createQueryBuilder(Tenant, 't')
      .andWhere('t.created_at >= :from AND t.created_at < :to', { from, to })
      .getCount();
  }

  async activeIds(): Promise<number[]> {
    const rows = await this.dataSource
      .createQueryBuilder(Tenant, 't')
      .innerJoin('tenant_statuses', 's', 's.id = t.status_id')
      .andWhere('s.code = :status', { status: TenantStatus.Active })
      .select('t.id', 'id')
      .orderBy('t.id', 'ASC')
      .getRawMany<{ id: number }>();

    return rows.map((row) => row.id);
  }

  async timezoneOf(id: number): Promise<string> {
    const row = await this.dataSource
      .createQueryBuilder(Tenant, 't')
      .andWhere('t.id = :id', { id })
      .select('t.timezone', 'timezone')
      .getRawOne<{ timezone: string }>();

    return row?.timezone ?? 'Asia/Ho_Chi_Minh';
  }

  private selected(tx?: EntityManager) {
    return (tx ?? this.dataSource.manager)
      .createQueryBuilder(Tenant, 't')
      .innerJoin('tenant_statuses', 's', 's.id = t.status_id')
      .select([
        't.id AS id',
        't.name AS name',
        't.status_id AS status_id',
        't.timezone AS timezone',
        't.created_at AS created_at',
        's.code AS status',
      ]);
  }

  private async lookupStatusId(status: TenantStatus, tx?: EntityManager): Promise<number> {
    const row = await (tx ?? this.dataSource.manager)
      .createQueryBuilder()
      .select('t.id', 'id')
      .from('tenant_statuses', 't')
      .where('t.code = :code', { code: status })
      .getRawOne<{
        id: number;
      }>();

    if (row === undefined || row === null) {
      throw new Error(`Lookup tenant_statuses.code='${status}' does not exist`);
    }

    return row.id;
  }

  private async requireById(id: number, tx?: EntityManager): Promise<Tenant> {
    const tenant = await this.findById(id, tx);

    if (tenant === null) {
      throw new Error(`tenants row ${id} disappeared right after it was written`);
    }

    return tenant;
  }
}

interface TenantRow {
  id: number;
  name: string;
  status_id: number;
  timezone: string;
  created_at: Date;
  status: Tenant['status'];
}

function hydrateTenant(row: TenantRow): Tenant {
  const tenant = new Tenant();
  tenant.id = row.id;
  tenant.name = row.name;
  tenant.statusId = row.status_id;
  tenant.timezone = row.timezone;
  tenant.createdAt = row.created_at;
  tenant.status = row.status;

  return tenant;
}
