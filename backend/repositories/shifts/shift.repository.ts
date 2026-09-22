import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Shift, ShiftStatus } from '../../models/shifts/shift.entity';
import { ContractItem } from '../../models/contracts/contract-item.entity';
import { CrossTenantLookup } from '../cross-tenant-lookup';
import { TenantScopedRepository } from '../tenant-scoped.repository';
import { Money } from '../../utils/money';

export interface SiteGeofence {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

export interface ShiftFieldContext {
  siteName: string;
  itemName: string;
}

export type ShiftScopeFilter =
  | { kind: 'all' }
  | { kind: 'own'; assigneeId: number }
  | { kind: 'team'; teamId: number }
  | { kind: 'unit'; managerId: number }
  | { kind: 'none' };

export interface ShiftListFilters {
  from?: string;
  to?: string;
  status?: ShiftStatus;
  assigneeId?: number;
  contractId?: number;
  teamId?: number;
  managerId?: number;
}

export interface ShiftScopeContext {
  teamId: number | null;
  assigneeId: number | null;
  managerId: number | null;
}

export interface IShiftRepository {
  createMany(shifts: readonly Shift[], tx?: EntityManager): Promise<void>;
  findById(tenantId: number, id: number, tx?: EntityManager): Promise<Shift | null>;
  findByIdUnscoped(id: number): Promise<Shift | null>;
  update(shift: Shift, tx?: EntityManager): Promise<Shift>;
  siteGeofenceFor(contractItemId: number): Promise<SiteGeofence | null>;
  fieldContextFor(contractItemId: number): Promise<ShiftFieldContext | null>;
  list(
    tenantId: number,
    scope: ShiftScopeFilter,
    filters: ShiftListFilters,
    page: { limit: number; offset: number },
  ): Promise<{ items: Shift[]; total: number }>;
  findByIdWithScopeContext(
    tenantId: number,
    id: number,
  ): Promise<{ shift: Shift; scope: ShiftScopeContext } | null>;
  claimFieldToken(id: number, now: Date, tx?: EntityManager): Promise<boolean>;
  revenueRows(tenantId: number, contractId: number, from: string, to: string): Promise<RevenueRow[]>;
  shiftsByContractForPeriod(tenantId: number, from: string, to: string): Promise<ContractShiftRow[]>;
  tenantRevenueCompleted(tenantId: number): Promise<Money>;
  overdue(tenantId: number, asOf: string): Promise<{ id: number }[]>;
  statsRows(
    tenantId: number,
    from: string,
    to: string,
  ): Promise<{ status: ShiftStatus; scheduledDate: Date }[]>;
  statsRowsBySite(
    tenantId: number,
    from: string,
    to: string,
  ): Promise<{ siteId: number; siteName: string; status: ShiftStatus; scheduledDate: Date }[]>;
  tenantRevenueForPeriod(tenantId: number, from: string, to: string): Promise<Money>;
  countByStatus(tenantId: number, status: ShiftStatus): Promise<number>;
  countForTenantOnDate(tenantId: number, date: string, tx?: EntityManager): Promise<number>;
  countsForTenantInRange(
    tenantId: number,
    from: string,
    to: string,
    tx?: EntityManager,
  ): Promise<Map<string, number>>;
}

@Injectable()
export class ShiftRepository extends TenantScopedRepository<Shift> implements IShiftRepository {
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

  async list(
    tenantId: number,
    scope: ShiftScopeFilter,
    filters: ShiftListFilters,
    page: { limit: number; offset: number },
  ): Promise<{ items: Shift[]; total: number }> {
    const query = this.listQuery(tenantId, scope, filters);
    const total = await query.getCount();
    const rows = await query
      .orderBy('s.scheduled_date', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .limit(page.limit)
      .offset(page.offset)
      .getRawMany<ShiftRow>();

    return { items: rows.map(hydrateShift), total };
  }

  async findByIdWithScopeContext(
    tenantId: number,
    id: number,
  ): Promise<{ shift: Shift; scope: ShiftScopeContext } | null> {
    const row = await this.selected(
      this.scopedTo(tenantId, 's').leftJoin('employees', 'a', 'a.id = s.assignee_id'),
    )
      .addSelect(['a.manager_id AS scope_manager_id'])
      .andWhere('s.id = :id', { id })
      .getRawOne<ShiftRow & { scope_manager_id: number | null }>();

    if (row === undefined || row === null) {
      return null;
    }

    return {
      shift: hydrateShift(row),
      scope: {
        teamId: row.team_id,
        assigneeId: row.assignee_id,
        managerId: row.scope_manager_id,
      },
    };
  }

  private listQuery(
    tenantId: number,
    scope: ShiftScopeFilter,
    filters: ShiftListFilters,
  ): SelectQueryBuilder<Shift> {
    const query = this.scopedTo(tenantId, 's')
      .leftJoin('employees', 'a', 'a.id = s.assignee_id')
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .innerJoin('contract_sites', 'cs', 'cs.id = ci.site_id')
      .select(this.shiftColumns());
    this.applyScope(query, scope);

    if (filters.from !== undefined) {
      query.andWhere('s.scheduled_date >= :from', { from: filters.from });
    }

    if (filters.to !== undefined) {
      query.andWhere('s.scheduled_date <= :to', { to: filters.to });
    }

    if (filters.status !== undefined) {
      query.andWhere('st.code = :status', { status: filters.status });
    }

    if (filters.assigneeId !== undefined) {
      query.andWhere('s.assignee_id = :filterAssigneeId', { filterAssigneeId: filters.assigneeId });
    }

    if (filters.contractId !== undefined) {
      query.andWhere('cs.contract_id = :filterContractId', { filterContractId: filters.contractId });
    }

    if (filters.teamId !== undefined) {
      query.andWhere('s.team_id = :filterTeamId', { filterTeamId: filters.teamId });
    }

    if (filters.managerId !== undefined) {
      query.andWhere('a.manager_id = :filterManagerId', { filterManagerId: filters.managerId });
    }

    return query;
  }

  private applyScope(query: SelectQueryBuilder<Shift>, scope: ShiftScopeFilter): void {
    switch (scope.kind) {
      case 'all':
        return;
      case 'own':
        query.andWhere('s.assignee_id = :scopeAssigneeId', { scopeAssigneeId: scope.assigneeId });

        return;
      case 'team':
        query.andWhere('s.team_id = :scopeTeamId', { scopeTeamId: scope.teamId });

        return;
      case 'unit':
        query.andWhere('a.manager_id = :scopeManagerId', { scopeManagerId: scope.managerId });

        return;
      case 'none':
        query.andWhere('1 = 0');

        return;
    }
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
      unitPrice: Money.fromString(row.unit_price),
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

  async tenantRevenueCompleted(tenantId: number): Promise<Money> {
    const row = await this.scopedTo(tenantId, 's')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .andWhere('s.completed_at IS NOT NULL')
      .select('COALESCE(SUM(ci.unit_price), 0)', 'total')
      .getRawOne<{
        total: string;
      }>();

    return Money.fromString(row?.total ?? '0');
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

  async statsRowsBySite(
    tenantId: number,
    from: string,
    to: string,
  ): Promise<
    {
      siteId: number;
      siteName: string;
      status: ShiftStatus;
      scheduledDate: Date;
    }[]
  > {
    const rows = await this.scopedTo(tenantId, 's')
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .innerJoin('contract_sites', 'cs', 'cs.id = ci.site_id')
      .andWhere('s.scheduled_date >= :from AND s.scheduled_date < :to', { from, to })
      .select([
        'cs.id AS site_id',
        'cs.name AS site_name',
        'st.code AS status',
        's.scheduled_date AS scheduled_date',
      ])
      .getRawMany<{
        site_id: number;
        site_name: string;
        status: ShiftStatus;
        scheduled_date: Date;
      }>();

    return rows.map((row) => ({
      siteId: row.site_id,
      siteName: row.site_name,
      status: row.status,
      scheduledDate: row.scheduled_date,
    }));
  }

  async tenantRevenueForPeriod(tenantId: number, from: string, to: string): Promise<Money> {
    const row = await this.scopedTo(tenantId, 's')
      .innerJoin('contract_items', 'ci', 'ci.id = s.contract_item_id')
      .andWhere('s.scheduled_date >= :from AND s.scheduled_date < :to', { from, to })
      .select('COALESCE(SUM(ci.unit_price), 0)', 'total')
      .getRawOne<{
        total: string;
      }>();

    return Money.fromString(row?.total ?? '0');
  }

  async countByStatus(tenantId: number, status: ShiftStatus): Promise<number> {
    return this.scopedTo(tenantId, 's')
      .innerJoin('shift_statuses', 'st', 'st.id = s.status_id')
      .andWhere('st.code = :status', { status })
      .getCount();
  }

  async countForTenantOnDate(tenantId: number, date: string, tx?: EntityManager): Promise<number> {
    return this.scopedTo(tenantId, 's', tx).andWhere('s.scheduled_date = :date', { date }).getCount();
  }

  async countsForTenantInRange(
    tenantId: number,
    from: string,
    to: string,
    tx?: EntityManager,
  ): Promise<Map<string, number>> {
    const rows = await this.scopedTo(tenantId, 's', tx)
      .andWhere('s.scheduled_date >= :from', { from })
      .andWhere('s.scheduled_date <= :to', { to })
      .select('s.scheduled_date', 'scheduled_date')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.scheduled_date')
      .getRawMany<{ scheduled_date: Date | string; count: string }>();

    return new Map(rows.map((row) => [dateKey(row.scheduled_date), Number(row.count)]));
  }

  async siteGeofenceFor(contractItemId: number): Promise<SiteGeofence | null> {
    const row = await this.crossTenant
      .queryFor(ContractItem, 'ci')
      .innerJoin('contract_sites', 'cs', 'cs.id = ci.site_id')
      .where('ci.id = :contractItemId', { contractItemId })
      .select(['cs.latitude AS latitude', 'cs.longitude AS longitude', 'cs.radius_meters AS radius_meters'])
      .getRawOne<{
        latitude: string | null;
        longitude: string | null;
        radius_meters: number;
      }>();

    if (row === undefined || row === null) {
      return null;
    }

    return {
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      radiusMeters: row.radius_meters,
    };
  }

  async fieldContextFor(contractItemId: number): Promise<ShiftFieldContext | null> {
    const row = await this.crossTenant
      .queryFor(ContractItem, 'ci')
      .innerJoin('contract_sites', 'cs', 'cs.id = ci.site_id')
      .where('ci.id = :contractItemId', { contractItemId })
      .select(['cs.name AS site_name', 'ci.name AS item_name'])
      .getRawOne<{ site_name: string; item_name: string }>();

    if (row === undefined || row === null) {
      return null;
    }

    return { siteName: row.site_name, itemName: row.item_name };
  }

  async claimFieldToken(id: number, now: Date, tx?: EntityManager): Promise<boolean> {
    const result = await this.crossTenant
      .queryFor(Shift, 's', tx)
      .update(Shift)
      .set({ fieldTokenUsedAt: now })
      .where('id = :id AND field_token_used_at IS NULL', { id })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  private selected(query: SelectQueryBuilder<Shift>): SelectQueryBuilder<Shift> {
    return query.innerJoin('shift_statuses', 'st', 'st.id = s.status_id').select(this.shiftColumns());
  }

  private shiftColumns(): string[] {
    return [
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
      's.geo_verified AS geo_verified',
      's.field_token_used_at AS field_token_used_at',
      's.team_id AS team_id',
      's.dispute_reason AS dispute_reason',
      's.dispute_reported_via AS dispute_reported_via',
      's.dispute_reported_by AS dispute_reported_by',
      's.dispute_reported_at AS dispute_reported_at',
      's.dispute_description AS dispute_description',
      's.created_at AS created_at',
      'st.code AS status',
    ];
  }
}

function dateKey(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

export interface RevenueRow {
  id: number;
  status: ShiftStatus;
  scheduledDate: Date;
  unitPrice: Money;
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
  geo_verified: boolean;
  field_token_used_at: Date | null;
  team_id: number | null;
  dispute_reason: string | null;
  dispute_reported_via: 'phone' | 'in_person' | null;
  dispute_reported_by: string | null;
  dispute_reported_at: Date | null;
  dispute_description: string | null;
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
  shift.geoVerified = row.geo_verified;
  shift.fieldTokenUsedAt = row.field_token_used_at;
  shift.teamId = row.team_id;
  shift.disputeReason = row.dispute_reason;
  shift.disputeReportedVia = row.dispute_reported_via;
  shift.disputeReportedBy = row.dispute_reported_by;
  shift.disputeReportedAt = row.dispute_reported_at;
  shift.disputeDescription = row.dispute_description;
  shift.createdAt = row.created_at;
  shift.status = row.status;

  return shift;
}
