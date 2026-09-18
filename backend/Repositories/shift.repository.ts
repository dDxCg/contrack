import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../Data/DbContext/data-source';
import { Shift, ShiftStatus } from '../Models/shift.entity';
import { TenantScopedRepository } from './tenant-scoped.repository';

@Injectable()
export class ShiftRepository extends TenantScopedRepository<Shift> {
  protected override readonly entity: EntityTarget<Shift> = Shift;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    super(dataSource);
  }

  async createMany(shifts: readonly Shift[]): Promise<void> {
    if (shifts.length === 0) {
      return;
    }

    const statusId = await this.lookupId('shift_statuses', shifts[0].status);
    for (const shift of shifts) {
      shift.statusId = statusId;
    }

    await this.dataSource.getRepository(Shift).save([...shifts]);
  }

  async findById(tenantId: number, id: number): Promise<Shift | null> {
    const row = await this.selected(this.scopedTo(tenantId, 's'))
      .andWhere('s.id = :id', { id })
      .getRawOne<ShiftRow>();

    return row === undefined || row === null ? null : hydrateShift(row);
  }

  /** Field submission (D3) carries no tenant_id — the signed token is the whole authorization. */
  async findByIdUnscoped(id: number): Promise<Shift | null> {
    const row = await this.selected(this.unscopedTo('s'))
      .andWhere('s.id = :id', { id })
      .getRawOne<ShiftRow>();

    return row === undefined || row === null ? null : hydrateShift(row);
  }

  async update(shift: Shift): Promise<Shift> {
    shift.statusId = await this.lookupId('shift_statuses', shift.status);
    const saved = await this.dataSource.getRepository(Shift).save(shift);
    const reloaded = await this.findById(saved.tenantId, saved.id);

    if (reloaded === null) {
      throw new Error(`shifts row ${saved.id} disappeared right after it was written`);
    }

    return reloaded;
  }

  /** Every shift for one contract in [from, to) with its item's unit_price — statements (FR10) and profitability (FR4). */
  async revenueRows(tenantId: number, contractId: number, from: string, to: string): Promise<RevenueRow[]> {
    const rows = (await this.dataSource.query(
      `SELECT s.id, st.code AS status, s.scheduled_date, ci.unit_price
       FROM shifts s
       JOIN shift_statuses st ON st.id = s.status_id
       JOIN contract_items ci ON ci.id = s.contract_item_id
       JOIN contract_sites cs ON cs.id = ci.site_id
       WHERE s.tenant_id = $1 AND cs.contract_id = $2 AND s.scheduled_date >= $3 AND s.scheduled_date < $4
       ORDER BY s.id ASC`,
      [tenantId, contractId, from, to],
    )) as { id: number; status: string; scheduled_date: Date; unit_price: string }[];

    return rows.map((row) => ({
      id: row.id,
      status: row.status as ShiftStatus,
      scheduledDate: row.scheduled_date,
      unitPrice: Number(row.unit_price),
    }));
  }

  /** Every contract's shifts in [from, to) tenant-wide, for reconciliation (FR13). */
  async shiftsByContractForPeriod(tenantId: number, from: string, to: string): Promise<ContractShiftRow[]> {
    const rows = (await this.dataSource.query(
      `SELECT cs.contract_id, s.completed_at
       FROM shifts s
       JOIN contract_items ci ON ci.id = s.contract_item_id
       JOIN contract_sites cs ON cs.id = ci.site_id
       WHERE s.tenant_id = $1 AND s.scheduled_date >= $2 AND s.scheduled_date < $3`,
      [tenantId, from, to],
    )) as { contract_id: number; completed_at: Date | null }[];

    return rows.map((row) => ({ contractId: row.contract_id, completed: row.completed_at !== null }));
  }

  /** All-time completed-shift revenue tenant-wide — the denominator of FR28's cost-to-revenue ratio. */
  async tenantRevenueCompleted(tenantId: number): Promise<number> {
    const [row] = (await this.dataSource.query(
      `SELECT COALESCE(SUM(ci.unit_price), 0) AS total
       FROM shifts s
       JOIN contract_items ci ON ci.id = s.contract_item_id
       WHERE s.tenant_id = $1 AND s.completed_at IS NOT NULL`,
      [tenantId],
    )) as { total: string }[];

    return Number(row.total);
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
