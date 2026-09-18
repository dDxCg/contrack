import { Injectable } from '@nestjs/common';
import { ContractCostRepository } from '../../repositories/contract-costs/contract-cost.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { addMonthsUTC, round2, toDateString } from '../../utils/period';

const TRAILING_MONTHS = 3;

@Injectable()
export class CostEstimationService {
  constructor(
    private readonly contractCostRepository: ContractCostRepository,
    private readonly shiftRepository: ShiftRepository,
  ) {}

  async estimate(tenantId: number, contractId: number, period: Date): Promise<number> {
    const trailing = await this.contractCostRepository.monthlyTotalsBefore(
      tenantId,
      contractId,
      toDateString(period),
      TRAILING_MONTHS,
    );
    if (trailing.length > 0) {
      return round2(trailing.reduce((sum, total) => sum + total, 0) / trailing.length);
    }

    const [tenantCost, tenantRevenue] = await Promise.all([
      this.contractCostRepository.tenantTotalCost(tenantId),
      this.shiftRepository.tenantRevenueCompleted(tenantId),
    ]);
    if (tenantRevenue === 0) {
      return 0;
    }

    const ratio = tenantCost / tenantRevenue;
    const rows = await this.shiftRepository.revenueRows(
      tenantId,
      contractId,
      toDateString(period),
      toDateString(addMonthsUTC(period, 1)),
    );
    const contractRevenue = rows.reduce((sum, row) => sum + row.unitPrice, 0);

    return round2(ratio * contractRevenue);
  }
}
