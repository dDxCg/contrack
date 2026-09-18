import { Inject, Injectable } from '@nestjs/common';
import { ContractCostRepository } from '../Repositories/contract-cost.repository';
import { ShiftRepository } from '../Repositories/shift.repository';
import { AccessContext } from './AccessControl/access-context';
import { CLOCK, IClock } from './AccessControl/clock';
import { CostEstimationService } from './cost-estimation.service';
import { addMonthsUTC, round2, startOfMonthUTC, toDateString } from './period';

export interface ContractProfitMonthView {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
  is_estimated: boolean;
}

/** One month of revenue vs. cost per contract — FR4. Never blank; FR28 estimates an unrecorded month. */
@Injectable()
export class ContractProfitabilityService {
  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly contractCostRepository: ContractCostRepository,
    private readonly costEstimationService: CostEstimationService,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async get(access: AccessContext, contractId: number, months: number): Promise<ContractProfitMonthView[]> {
    const currentMonth = startOfMonthUTC(this.clock.now());
    const results: ContractProfitMonthView[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const period = addMonthsUTC(currentMonth, -i);
      results.push(await this.monthOf(access.tenantId, contractId, period));
    }

    return results;
  }

  private async monthOf(
    tenantId: number,
    contractId: number,
    period: Date,
  ): Promise<ContractProfitMonthView> {
    const periodStart = toDateString(period);
    const rows = await this.shiftRepository.revenueRows(
      tenantId,
      contractId,
      periodStart,
      toDateString(addMonthsUTC(period, 1)),
    );
    const revenue = round2(rows.reduce((sum, row) => sum + row.unitPrice, 0));

    const recorded = await this.contractCostRepository.totalForMonth(tenantId, contractId, periodStart);
    const isEstimated = recorded === null;
    const cost = isEstimated
      ? await this.costEstimationService.estimate(tenantId, contractId, period)
      : recorded;

    const profit = round2(revenue - cost);
    const marginPct = revenue === 0 ? 0 : round2((profit / revenue) * 100);

    return { period: periodStart, revenue, cost, profit, margin_pct: marginPct, is_estimated: isEstimated };
  }
}
