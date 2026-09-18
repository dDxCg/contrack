import { Injectable } from '@nestjs/common';
import { ShiftRepository } from '../Repositories/shift.repository';
import { AccessContext } from './AccessControl/access-context';
import { addMonthsUTC, toDateString } from './period';

export interface ReconciliationRowView {
  contract_id: number;
  shifts_due: number;
  shifts_with_evidence: number;
  variance: number;
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly shiftRepository: ShiftRepository) {}

  async get(access: AccessContext, period: Date): Promise<ReconciliationRowView[]> {
    const from = toDateString(period);
    const to = toDateString(addMonthsUTC(period, 1));
    const rows = await this.shiftRepository.shiftsByContractForPeriod(access.tenantId, from, to);

    const byContract = new Map<number, { due: number; withEvidence: number }>();
    for (const row of rows) {
      const totals = byContract.get(row.contractId) ?? { due: 0, withEvidence: 0 };
      totals.due += 1;
      if (row.completed) {
        totals.withEvidence += 1;
      }
      byContract.set(row.contractId, totals);
    }

    return [...byContract.entries()]
      .sort(([a], [b]) => a - b)
      .map(([contractId, totals]) => ({
        contract_id: contractId,
        shifts_due: totals.due,
        shifts_with_evidence: totals.withEvidence,
        variance: totals.due - totals.withEvidence,
      }));
  }
}
