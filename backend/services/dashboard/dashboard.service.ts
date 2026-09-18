import { Inject, Injectable } from '@nestjs/common';
import { ShiftStatsView, DashboardSummaryView } from '../../dtos/dashboard/dashboard.response.dto';
import { DashboardConflictingPeriodException } from '../../models/domain-errors';
import { ContractStatus } from '../../models/contracts/contract.entity';
import { ShiftStatus } from '../../models/shifts/shift.entity';
import { StatementStatus } from '../../models/statements/statement.entity';
import { ContractRepository } from '../../repositories/contracts/contract.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { StatementRepository } from '../../repositories/statements/statement.repository';
import { AccessContext } from '../access-control/access-context';
import { CLOCK, IClock } from '../access-control/clock';
import { addDaysUTC, addMonthsUTC, round2, startOfMonthUTC, toDateString } from '../../utils/period';

const EXPIRY_THRESHOLD_DAYS = 30;

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
    private readonly contractRepository: ContractRepository,
    private readonly shiftRepository: ShiftRepository,
    private readonly statementRepository: StatementRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async get(access: AccessContext, query: DashboardQuery): Promise<DashboardSummaryView> {
    const now = this.clock.now();
    const period = resolvePeriod(query, now);
    const from = toDateString(period.start);
    const to = toDateString(period.end);
    const today = toDateString(now);

    const [activeContracts, expiring, disputedShifts, projectedRevenue, statsRows, contractShiftRows] =
      await Promise.all([
        this.contractRepository.countByStatus(access.tenantId, ContractStatus.Active),
        this.contractRepository.expiringWithin(
          access.tenantId,
          today,
          toDateString(addDaysUTC(now, EXPIRY_THRESHOLD_DAYS)),
        ),
        this.shiftRepository.countByStatus(access.tenantId, ShiftStatus.Disputed),
        this.shiftRepository.tenantRevenueForPeriod(access.tenantId, from, to),
        this.shiftRepository.statsRows(access.tenantId, from, to),
        this.shiftRepository.shiftsByContractForPeriod(access.tenantId, from, to),
      ]);

    return {
      active_contracts: activeContracts,
      expiring_soon: expiring.length,
      disputed_shifts: disputedShifts,
      projected_revenue: round2(projectedRevenue),
      statements_closed: await this.statementsClosed(access.tenantId, contractShiftRows, from),
      shifts_summary: computeShiftStats(statsRows, today),
      bucket_unit: period.bucketUnit,
    };
  }

  private async statementsClosed(
    tenantId: number,
    rows: readonly { contractId: number }[],
    period: string,
  ): Promise<{ closed: number; total: number }> {
    const contractIds = [...new Set(rows.map((row) => row.contractId))];
    let closed = 0;

    for (const contractId of contractIds) {
      const statement = await this.statementRepository.findByContractPeriod(tenantId, contractId, period);
      if (statement?.status === StatementStatus.Sent) {
        closed += 1;
      }
    }

    return { closed, total: contractIds.length };
  }
}

function resolvePeriod(query: DashboardQuery, now: Date): ResolvedPeriod {
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

  const start = startOfMonthUTC(now);

  return { start, end: addMonthsUTC(start, 1), bucketUnit: 'month' };
}

function computeShiftStats(
  rows: readonly { status: ShiftStatus; scheduledDate: Date }[],
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
