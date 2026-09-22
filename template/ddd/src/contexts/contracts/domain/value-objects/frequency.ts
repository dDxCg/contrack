import { FieldViolation } from '../../../../shared-kernel/domain-error';
import { InvalidFrequencyError } from '../errors';
import { FrequencyUnit } from './frequency-unit';

/**
 * Frequency — immutable, self-validating value object.
 *
 * Encapsulates the recurrence rules that used to live in
 * ContractItem#setFrequency + ContractItem#assertValid()
 * (backend/models/contracts/contract-item.entity.ts). Preserves the exact
 * invariants documented there:
 *   - frequency_count must be a positive integer
 *   - day_of_week and day_of_month are mutually exclusive
 *   - day_of_week is only meaningful when the unit is Week
 *   - day_of_month is only meaningful when the unit is Month/Quarter/Year
 *   - day_of_week must be in [0, 6], day_of_month must be in [1, 31]
 *     (in the ORM these last two were DB CHECK constraints; here, with no
 *     database in domain/, they are enforced directly by the value object)
 *
 * Being a value object, an invalid Frequency simply cannot be constructed —
 * `Frequency.create(...)` throws InvalidFrequencyError instead of returning
 * a half-valid object that callers must remember to `.assertValid()`.
 */
export class Frequency {
  private constructor(
    readonly count: number,
    readonly unit: FrequencyUnit,
    readonly rule: string | null,
    readonly dayOfWeek: number | null,
    readonly dayOfMonth: number | null,
  ) {}

  static create(params: {
    count: number;
    unit: FrequencyUnit;
    rule?: string | null;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
  }): Frequency {
    const dayOfWeek = params.dayOfWeek ?? null;
    const dayOfMonth = params.dayOfMonth ?? null;
    const violations = Frequency.validate(params.count, params.unit, dayOfWeek, dayOfMonth);
    if (violations.length > 0) {
      throw new InvalidFrequencyError(violations);
    }
    return new Frequency(params.count, params.unit, params.rule ?? null, dayOfWeek, dayOfMonth);
  }

  /** Same shape as ContractItem#assertValid() but pure — returns violations instead of mutating state. */
  static validate(
    count: number,
    unit: FrequencyUnit,
    dayOfWeek: number | null,
    dayOfMonth: number | null,
  ): FieldViolation[] {
    const violations: FieldViolation[] = [];
    if (!Number.isInteger(count) || count < 1) {
      violations.push({ field: 'frequency_count', message: 'Frequency count must be a positive integer' });
    }
    if (dayOfWeek != null && dayOfMonth != null) {
      violations.push({ field: 'day_of_week', message: 'Set day_of_week or day_of_month, not both' });
    }
    if (dayOfWeek != null && (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)) {
      violations.push({ field: 'day_of_week', message: 'day_of_week must be an integer between 0 and 6' });
    }
    if (dayOfMonth != null && (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)) {
      violations.push({
        field: 'day_of_month',
        message: 'day_of_month must be an integer between 1 and 31',
      });
    }
    if (dayOfWeek != null && unit !== FrequencyUnit.Week) {
      violations.push({ field: 'day_of_week', message: 'day_of_week only applies to a weekly frequency' });
    }
    if (dayOfMonth != null && !isMonthlyGrained(unit)) {
      violations.push({
        field: 'day_of_month',
        message: 'day_of_month only applies to a monthly, quarterly or yearly frequency',
      });
    }
    return violations;
  }

  equals(other: Frequency): boolean {
    return (
      this.count === other.count &&
      this.unit === other.unit &&
      this.rule === other.rule &&
      this.dayOfWeek === other.dayOfWeek &&
      this.dayOfMonth === other.dayOfMonth
    );
  }
}

export function isMonthlyGrained(unit: FrequencyUnit): boolean {
  return unit === FrequencyUnit.Month || unit === FrequencyUnit.Quarter || unit === FrequencyUnit.Year;
}
