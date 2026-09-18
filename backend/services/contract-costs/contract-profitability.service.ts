import { Inject, Injectable } from '@nestjs/common';
import { ContractProfitMonthView } from '../../dtos/contract-costs/contract-costs.response.dto';
import { ContractCostRepository } from '../../repositories/contract-costs/contract-cost.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { TenantRepository } from '../../repositories/tenants/tenant.repository';
import { AccessContext } from '../access-control/access-context';
import { CLOCK, IClock } from '../access-control/clock';
import { CostEstimationService } from './cost-estimation.service';
import { addMonthsUTC, round2, startOfMonthInZone, toDateString } from '../../utils/period';
@Injectable()
export class ContractProfitabilityService {
  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly contractCostRepository: ContractCostRepository,
    private readonly costEstimationService: CostEstimationService,
    private readonly tenantRepository: TenantRepository,
    @Inject(CLOCK)
    private readonly clock: IClock,
  ) {}
  async get(access: AccessContext, contractId: number, months: number): Promise<ContractProfitMonthView[]> {
    const timezone = await this.tenantRepository.timezoneOf(access.tenantId);
    const currentMonth = startOfMonthInZone(this.clock.now(), timezone);
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
