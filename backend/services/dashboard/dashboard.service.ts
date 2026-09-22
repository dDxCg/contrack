import { Inject, Injectable } from '@nestjs/common';
import {
  ShiftStatsView,
  SiteShiftStatsView,
  ProfitTrendBucketView,
  DashboardComparisonView,
  DashboardSummaryView,
} from '../../dtos/dashboard/dashboard.response.dto';
import { TrendBucketView } from '../../dtos/platform/platform.response.dto';
import { DashboardConflictingPeriodException } from '../../models/domain-errors';
import { ContractStatus } from '../../models/contracts/contract.entity';
import { ShiftStatus } from '../../models/shifts/shift.entity';
import { StatementStatus } from '../../models/statements/statement.entity';
import {
  ContractCostRepository,
  IContractCostRepository,
} from '../../repositories/contract-costs/contract-cost.repository';
import { ContractRepository, IContractRepository } from '../../repositories/contracts/contract.repository';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import {
  IStatementRepository,
  StatementRepository,
} from '../../repositories/statements/statement.repository';
import { ITenantRepository, TenantRepository } from '../../repositories/tenants/tenant.repository';
import { AccessContext } from '../access-control/access-context';
import { CLOCK, IClock } from '../access-control/clock';
import { CostEstimationService } from '../contract-costs/cost-estimation.service';
import {
  addDaysUTC,
  addMonthsUTC,
  round2,
  startOfMonthInZone,
  startOfMonthUTC,
  toDateString,
  toDateStringInZone,
} from '../../utils/period';
import { Money } from '../../utils/money';

const EXPIRY_THRESHOLD_DAYS = 30;
const TREND_BUCKET_COUNT = 6;
const RENEWAL_COHORT_MONTHS = 12;

export interface DashboardQuery {
  month?: string;
  from?: string;
  to?: string;
}

interface ResolvedPeriod {
  start: Date;
  end: Date;
  bucketUnit: 'month' | 'week' | 'day';
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(ContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(StatementRepository)
    private readonly statementRepository: IStatementRepository,
    @Inject(TenantRepository)
    private readonly tenantRepository: ITenantRepository,
    @Inject(ContractCostRepository)
    private readonly contractCostRepository: IContractCostRepository,
    private readonly costEstimationService: CostEstimationService,
    @Inject(CLOCK)
    private readonly clock: IClock,
  ) {}

  async get(access: AccessContext, query: DashboardQuery): Promise<DashboardSummaryView> {
    const now = this.clock.now();
    const timezone = await this.tenantRepository.timezoneOf(access.tenantId);
    const period = resolvePeriod(query, now, timezone);
    const from = toDateString(period.start);
    const to = toDateString(period.end);
    const today = toDateStringInZone(now, timezone);
    const [
      activeContracts,
      expiring,
      disputedShifts,
      projectedRevenue,
      statsRows,
      statsRowsBySite,
      contractShiftRows,
    ] = await Promise.all([
      this.contractRepository.countByStatus(access.tenantId, ContractStatus.Active),
      this.contractRepository.expiringWithin(
        access.tenantId,
        today,
        toDateString(addDaysUTC(now, EXPIRY_THRESHOLD_DAYS)),
      ),
      this.shiftRepository.countByStatus(access.tenantId, ShiftStatus.Disputed),
      this.shiftRepository.tenantRevenueForPeriod(access.tenantId, from, to),
      this.shiftRepository.statsRows(access.tenantId, from, to),
      this.shiftRepository.statsRowsBySite(access.tenantId, from, to),
      this.shiftRepository.shiftsByContractForPeriod(access.tenantId, from, to),
    ]);

    return {
      active_contracts: activeContracts,
      expiring_soon: expiring.length,
      disputed_shifts: disputedShifts,
      projected_revenue: projectedRevenue.toNumber(),
      statements_closed: await this.statementsClosed(access.tenantId, contractShiftRows, from),
      shifts_summary: computeShiftStats(statsRows, today),
      shifts_by_site: computeShiftStatsBySite(statsRowsBySite, today),
      new_contracts_trend: await this.newContractsTrend(access.tenantId, period),
      ...(await this.renewalRates(access.tenantId, period)),
      profit_trend: await this.profitTrend(access.tenantId, period),
      comparison: await this.comparison(access.tenantId, period),
      bucket_unit: period.bucketUnit,
    };
  }

  private async profitTrend(tenantId: number, period: ResolvedPeriod): Promise<ProfitTrendBucketView[]> {
    const lastDay = addDaysUTC(period.end, -1);
    const monthEnd = addMonthsUTC(startOfMonthUTC(lastDay), 1);
    const windows: { start: Date; end: Date }[] = [];

    for (let i = TREND_BUCKET_COUNT - 1; i >= 0; i--) {
      const start = addMonthsUTC(monthEnd, -1 - i);
      windows.push({ start, end: addMonthsUTC(start, 1) });
    }

    return Promise.all(windows.map((window) => this.profitBucket(tenantId, window)));
  }

  private async profitBucket(
    tenantId: number,
    window: { start: Date; end: Date },
  ): Promise<ProfitTrendBucketView> {
    const { revenue, cost, isEstimated } = await this.revenueAndCost(tenantId, window);
    const profit = revenue.subtract(cost);
    const marginPct = revenue.isZero() ? 0 : round2((profit.toNumber() / revenue.toNumber()) * 100);

    return {
      period_start: toDateString(window.start),
      period_end: toDateString(addDaysUTC(window.end, -1)),
      label: `T${window.start.getUTCMonth() + 1}`,
      revenue: revenue.toNumber(),
      cost: cost.toNumber(),
      profit: profit.toNumber(),
      margin_pct: marginPct,
      is_estimated: isEstimated,
    };
  }

  private async revenueAndCost(
    tenantId: number,
    window: { start: Date; end: Date },
  ): Promise<{ revenue: Money; cost: Money; isEstimated: boolean }> {
    const from = toDateString(window.start);
    const to = toDateString(window.end);
    const [revenue, contractShiftRows] = await Promise.all([
      this.shiftRepository.tenantRevenueForPeriod(tenantId, from, to),
      this.shiftRepository.shiftsByContractForPeriod(tenantId, from, to),
    ]);
    const contractIds = [...new Set(contractShiftRows.map((row) => row.contractId))];
    let cost = Money.zero();
    let isEstimated = false;

    for (const contractId of contractIds) {
      const recorded = await this.contractCostRepository.totalForMonth(tenantId, contractId, from);

      if (recorded !== null) {
        cost = cost.add(recorded);
      } else {
        isEstimated = true;
        cost = cost.add(await this.costEstimationService.estimate(tenantId, contractId, window.start));
      }
    }

    return { revenue, cost, isEstimated };
  }

  private async comparison(tenantId: number, period: ResolvedPeriod): Promise<DashboardComparisonView> {
    const window = trendWindows(period, 2)[0];
    const from = toDateString(window.start);
    const to = toDateString(window.end);
    const [{ revenue, cost }, statsRows, newContracts] = await Promise.all([
      this.revenueAndCost(tenantId, window),
      this.shiftRepository.statsRows(tenantId, from, to),
      this.contractRepository.countSignedBetween(tenantId, from, to),
    ]);
    const profit = revenue.subtract(cost);
    const marginPct = revenue.isZero() ? 0 : round2((profit.toNumber() / revenue.toNumber()) * 100);

    return {
      period_start: from,
      period_end: toDateString(addDaysUTC(window.end, -1)),
      projected_revenue: revenue.toNumber(),
      margin_pct: marginPct,
      late_shifts: computeShiftStats(statsRows, toDateString(window.end)).overdue,
      new_contracts: newContracts,
    };
  }

  private async renewalRates(
    tenantId: number,
    period: ResolvedPeriod,
  ): Promise<{ renewal_rate_pct: number; cancellation_rate_pct: number }> {
    const cohortFrom = toDateString(addMonthsUTC(period.end, -RENEWAL_COHORT_MONTHS));
    const cohortTo = toDateString(period.end);
    const counts = await this.contractRepository.expiryCohortStatusCounts(tenantId, cohortFrom, cohortTo);
    const countOf = (status: ContractStatus): number =>
      counts.find((row) => row.status === status)?.count ?? 0;
    const renewed = countOf(ContractStatus.Renewed);
    const expired = countOf(ContractStatus.Expired);
    const cancelled = countOf(ContractStatus.Cancelled);
    const cohortTotal = renewed + expired + cancelled;

    return {
      renewal_rate_pct: cohortTotal === 0 ? 0 : round2((renewed / cohortTotal) * 100),
      cancellation_rate_pct: cohortTotal === 0 ? 0 : round2((cancelled / cohortTotal) * 100),
    };
  }

  private async newContractsTrend(tenantId: number, period: ResolvedPeriod): Promise<TrendBucketView[]> {
    const windows = trendWindows(period, TREND_BUCKET_COUNT);

    return Promise.all(
      windows.map(async (window) => ({
        period_start: toDateString(window.start),
        period_end: toDateString(addDaysUTC(window.end, -1)),
        label: bucketLabel(window.start, period.bucketUnit),
        count: await this.contractRepository.countSignedBetween(
          tenantId,
          toDateString(window.start),
          toDateString(window.end),
        ),
      })),
    );
  }

  private async statementsClosed(
    tenantId: number,
    rows: readonly {
      contractId: number;
    }[],
    period: string,
  ): Promise<{
    closed: number;
    total: number;
  }> {
    const contractIds = [...new Set(rows.map((row) => row.contractId))];
    const byContract = await this.statementRepository.findByContractPeriodBatch(
      tenantId,
      contractIds,
      period,
    );
    let closed = 0;

    for (const contractId of contractIds) {
      if (byContract.get(contractId)?.status === StatementStatus.Sent) {
        closed += 1;
      }
    }

    return { closed, total: contractIds.length };
  }
}

function resolvePeriod(query: DashboardQuery, now: Date, timezone: string): ResolvedPeriod {
  const hasMonth = query.month !== undefined;
  const hasRange = query.from !== undefined || query.to !== undefined;

  if (hasMonth && hasRange) {
    throw new DashboardConflictingPeriodException();
  }

  if (hasMonth) {
    const start = new Date(`${query.month}-01T00:00:00.000Z`);

    return { start, end: addMonthsUTC(start, 1), bucketUnit: 'month' };
  }

  if (hasRange) {
    if (query.from === undefined || query.to === undefined) {
      throw new DashboardConflictingPeriodException();
    }

    const start = new Date(query.from);

    return { start, end: addDaysUTC(new Date(query.to), 1), bucketUnit: 'day' };
  }

  const start = startOfMonthInZone(now, timezone);

  return { start, end: addMonthsUTC(start, 1), bucketUnit: 'month' };
}

function trendWindows(period: ResolvedPeriod, count: number): { start: Date; end: Date }[] {
  if (period.bucketUnit === 'month') {
    const windows: { start: Date; end: Date }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const start = addMonthsUTC(period.start, -i);
      windows.push({ start, end: addMonthsUTC(start, 1) });
    }

    return windows;
  }

  const lengthMs = period.end.getTime() - period.start.getTime();
  const windows: { start: Date; end: Date }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const end = new Date(period.end.getTime() - i * lengthMs);
    windows.push({ start: new Date(end.getTime() - lengthMs), end });
  }

  return windows;
}

function bucketLabel(start: Date, bucketUnit: ResolvedPeriod['bucketUnit']): string {
  return bucketUnit === 'month' ? `T${start.getUTCMonth() + 1}` : toDateString(start);
}

function computeShiftStats(
  rows: readonly {
    status: ShiftStatus;
    scheduledDate: Date;
  }[],
  today: string,
): ShiftStatsView {
  let notDue = 0;
  let completed = 0;
  let overdue = 0;
  let disputed = 0;

  for (const row of rows) {
    if (toDateString(row.scheduledDate) > today) {
      notDue += 1;
      continue;
    }

    if (row.status === ShiftStatus.Completed) {
      completed += 1;
    } else if (row.status === ShiftStatus.Disputed) {
      disputed += 1;
    } else {
      overdue += 1;
    }
  }

  const due = rows.length - notDue;
  const pct = (count: number): number | null => (due === 0 ? null : round2((count / due) * 100));

  return {
    scheduled: rows.length,
    due,
    not_due: notDue,
    completed,
    completed_pct: pct(completed),
    overdue,
    overdue_pct: pct(overdue),
    disputed,
    disputed_pct: pct(disputed),
    missing_evidence: 0,
  };
}

function computeShiftStatsBySite(
  rows: readonly {
    siteId: number;
    siteName: string;
    status: ShiftStatus;
    scheduledDate: Date;
  }[],
  today: string,
): SiteShiftStatsView[] {
  const bySite = new Map<
    number,
    { siteName: string; rows: { status: ShiftStatus; scheduledDate: Date }[] }
  >();

  for (const row of rows) {
    const group = bySite.get(row.siteId);

    if (group === undefined) {
      bySite.set(row.siteId, { siteName: row.siteName, rows: [row] });
    } else {
      group.rows.push(row);
    }
  }

  const stats = [...bySite.entries()].map(([siteId, group]) => ({
    site_id: siteId,
    site_name: group.siteName,
    ...computeShiftStats(group.rows, today),
  }));
  stats.sort((a, b) => (a.completed_pct ?? Infinity) - (b.completed_pct ?? Infinity));

  return stats;
}
