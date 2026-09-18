import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Shift, ShiftStatus } from '../../models/shifts/shift.entity';
import { CrossTenantLookup } from '../cross-tenant-lookup';
import { TenantScopedRepository } from '../tenant-scoped.repository';
@Injectable()
export class ShiftRepository extends TenantScopedRepository<Shift> {
  protected override readonly entity: EntityTarget<Shift> = Shift;
  private readonly crossTenant: CrossTenantLookup;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
    this.crossTenant = new CrossTenantLookup(dataSource);
  }
  async createMany(shifts: readonly Shift[], tx?: EntityManager): Promise<void> {
    if (shifts.length === 0) {
      return;
    }
    const statusId = await this.lookupId('shift_statuses', shifts[0].status, tx);
    for (const shift of shifts) {
      shift.statusId = statusId;
    }
    await this.mgr(tx)
      .getRepository(Shift)
      .save([...shifts]);
  }
  async findById(tenantId: number, id: number, tx?: EntityManager): Promise<Shift | null> {
    const row = await this.selected(this.scopedTo(tenantId, 's', tx))
      .andWhere('s.id = :id', { id })
      .getRawOne<ShiftRow>();
    return row === undefined || row === null ? null : hydrateShift(row);
  }
  async findByIdUnscoped(id: number): Promise<Shift | null> {
    const row = await this.selected(this.crossTenant.queryFor(Shift, 's'))
      .andWhere('s.id = :id', { id })
      .getRawOne<ShiftRow>();
    return row === undefined || row === null ? null : hydrateShift(row);
  }
  async update(shift: Shift, tx?: EntityManager): Promise<Shift> {
    shift.statusId = await this.lookupId('shift_statuses', shift.status, tx);
    const saved = await this.mgr(tx).getRepository(Shift).save(shift);
    const reloaded = await this.findById(saved.tenantId, saved.id, tx);
    if (reloaded === null) {
      throw new Error(`shifts row ${saved.id} disappeared right after it was written`);
    }
    return reloaded;
  }
  async revenueRows(tenantId: number, contractId: number, from: string, to: string): Promise<RevenueRow[]> {
    const rows = await this.scopedTo(tenantId, 's')
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .innerJoin('contract_sites', 'cs', 'cs.id = ci.site_id')
      .andWhere('cs.contract_id = :contractId', { contractId })
      .andWhere('s.scheduled_date >= :from AND s.scheduled_date < :to', { from, to })
      .orderBy('s.id', 'ASC')
      .select([
        's.id AS id',
        'st.code AS status',
        's.scheduled_date AS scheduled_date',
        'ci.unit_price AS unit_price',
      ])
      .getRawMany<{
        id: number;
        status: string;
        scheduled_date: Date;
        unit_price: string;
      }>();
    return rows.map((row) => ({
      id: row.id,
      status: row.status as ShiftStatus,
      scheduledDate: row.scheduled_date,
      unitPrice: Number(row.unit_price),
    }));
  }
  async shiftsByContractForPeriod(tenantId: number, from: string, to: string): Promise<ContractShiftRow[]> {
    const rows = await this.scopedTo(tenantId, 's')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .innerJoin('contract_sites', 'cs', 'cs.id = ci.site_id')
      .andWhere('s.scheduled_date >= :from AND s.scheduled_date < :to', { from, to })
      .select(['cs.contract_id AS contract_id', 's.completed_at AS completed_at'])
      .getRawMany<{
        contract_id: number;
        completed_at: Date | null;
      }>();
    return rows.map((row) => ({ contractId: row.contract_id, completed: row.completed_at !== null }));
  }
  async tenantRevenueCompleted(tenantId: number): Promise<number> {
    const row = await this.scopedTo(tenantId, 's')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .andWhere('s.completed_at IS NOT NULL')
      .select('COALESCE(SUM(ci.unit_price), 0)', 'total')
      .getRawOne<{
        total: string;
      }>();
    return Number(row?.total ?? 0);
  }
  async overdue(
    tenantId: number,
    asOf: string,
  ): Promise<
    {
      id: number;
    }[]
  > {
    return this.scopedTo(tenantId, 's')
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .andWhere('s.scheduled_date < :asOf', { asOf })
      .andWhere("st.code NOT IN ('completed', 'disputed')")
      .orderBy('s.id', 'ASC')
      .select('s.id', 'id')
      .getRawMany<{
        id: number;
      }>();
  }
  async statsRows(
    tenantId: number,
    from: string,
    to: string,
  ): Promise<
    {
      status: ShiftStatus;
      scheduledDate: Date;
    }[]
  > {
    const rows = await this.scopedTo(tenantId, 's')
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .andWhere('s.scheduled_date >= :from AND s.scheduled_date < :to', { from, to })
      .select(['st.code AS status', 's.scheduled_date AS scheduled_date'])
      .getRawMany<{
        status: ShiftStatus;
        scheduled_date: Date;
      }>();
    return rows.map((row) => ({ status: row.status, scheduledDate: row.scheduled_date }));
  }
  async tenantRevenueForPeriod(tenantId: number, from: string, to: string): Promise<number> {
    const row = await this.scopedTo(tenantId, 's')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .andWhere('s.scheduled_date >= :from AND s.scheduled_date < :to', { from, to })
      .select('COALESCE(SUM(ci.unit_price), 0)', 'total')
      .getRawOne<{
        total: string;
      }>();
    return Number(row?.total ?? 0);
  }
  async countByStatus(tenantId: number, status: ShiftStatus): Promise<number> {
    return this.scopedTo(tenantId, 's')
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .andWhere('st.code = :status', { status })
      .getCount();
  }
  private selected(query: SelectQueryBuilder<Shift>): SelectQueryBuilder<Shift> {
    return query
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .select([
        's.id AS id',
        's.tenant_id AS tenant_id',
        's.contract_item_id AS contract_item_id',
        's.assignee_id AS assignee_id',
        's.scheduled_date AS scheduled_date',
        's.completed_at AS completed_at',
        's.status_id AS status_id',
        's.latitude AS latitude',
        's.longitude AS longitude',
        's.captured_at AS captured_at',
        's.receipt_photo_url AS receipt_photo_url',
        's.created_at AS created_at',
        'st.code AS status',
      ]);
  }
}
export interface RevenueRow {
  id: number;
  status: ShiftStatus;
  scheduledDate: Date;
  unitPrice: number;
}
export interface ContractShiftRow {
  contractId: number;
  completed: boolean;
}
interface ShiftRow {
  id: number;
  tenant_id: number;
  contract_item_id: number;
  assignee_id: number | null;
  scheduled_date: Date;
  completed_at: Date | null;
  status_id: number;
  latitude: string | null;
  longitude: string | null;
  captured_at: Date | null;
  receipt_photo_url: string | null;
  created_at: Date;
  status: ShiftStatus;
}
function hydrateShift(row: ShiftRow): Shift {
  const shift = new Shift();
  shift.id = row.id;
  shift.tenantId = row.tenant_id;
  shift.contractItemId = row.contract_item_id;
  shift.assigneeId = row.assignee_id;
  shift.scheduledDate = row.scheduled_date;
  shift.completedAt = row.completed_at;
  shift.statusId = row.status_id;
  shift.latitude = row.latitude === null ? null : Number(row.latitude);
  shift.longitude = row.longitude === null ? null : Number(row.longitude);
  shift.capturedAt = row.captured_at;
  shift.receiptPhotoUrl = row.receipt_photo_url;
  shift.createdAt = row.created_at;
  shift.status = row.status;
  return shift;
}
