import { Injectable } from '@nestjs/common';
import { ContractCostRepository } from '../../repositories/contract-costs/contract-cost.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { addMonthsUTC, toDateString } from '../../utils/period';
import { Money } from '../../utils/money';
const TRAILING_MONTHS = 3;
@Injectable()
export class CostEstimationService {
  constructor(
    private readonly contractCostRepository: ContractCostRepository,
    private readonly shiftRepository: ShiftRepository,
  ) {}
  async estimate(tenantId: number, contractId: number, period: Date): Promise<Money> {
    const trailing = await this.contractCostRepository.monthlyTotalsBefore(
      tenantId,
      contractId,
      toDateString(period),
      TRAILING_MONTHS,
    );
    if (trailing.length > 0) {
      return Money.sumOf(trailing).divide(trailing.length);
    }
    const [tenantCost, tenantRevenue] = await Promise.all([
      this.contractCostRepository.tenantTotalCost(tenantId),
      this.shiftRepository.tenantRevenueCompleted(tenantId),
    ]);
    if (tenantRevenue.isZero()) {
      return Money.zero();
    }
    const ratio = tenantCost.toNumber() / tenantRevenue.toNumber();
    const rows = await this.shiftRepository.revenueRows(
      tenantId,
      contractId,
      toDateString(period),
      toDateString(addMonthsUTC(period, 1)),
    );
    const contractRevenue = Money.sumOf(rows.map((row) => row.unitPrice));
    return contractRevenue.multiply(ratio);
  }
}
