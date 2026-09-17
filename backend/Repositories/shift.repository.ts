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
