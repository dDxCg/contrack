import { Inject, Injectable } from '@nestjs/common';
import {
  ContractCostRepository,
  IContractCostRepository,
} from '../../repositories/contract-costs/contract-cost.repository';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { addMonthsUTC, toDateString } from '../../utils/period';
import { Money } from '../../utils/money';

const TRAILING_MONTHS = 3;

@Injectable()
export class CostEstimationService {
  constructor(
    @Inject(ContractCostRepository)
    private readonly contractCostRepository: IContractCostRepository,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
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
