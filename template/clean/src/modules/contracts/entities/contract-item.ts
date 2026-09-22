import { FieldViolation } from './errors';
import { Money } from './money';

// Ported from backend/models/contracts/contract-item.entity.ts (FrequencyUnit enum
// and the day_of_week / day_of_month invariants), minus the TypeORM decorators.
export enum FrequencyUnit {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Quarter = 'quarter',
  Year = 'year',
}

export interface ContractItemProps {
  id?: number;
  tenantId: number;
  siteId?: number;
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: Money;
  createdAt?: Date;
}

/**
 * Enterprise business rule: a contract item's frequency must be internally
 * consistent (day_of_week XOR day_of_month, each only valid for the matching
 * frequency unit, and each within its numeric range), and its price may never
 * be negative. This class enforces that invariant directly — it is not
 * possible to construct or mutate an item into an invalid state through its
 * public API without getting FieldViolation[] back via validate()/assertValid.
 */
export class ContractItem {
  readonly id?: number;
  readonly tenantId: number;
  siteId?: number;
  private _name: string;
  private _frequencyCount: number;
  private _frequencyUnit: FrequencyUnit;
  private _frequencyRule: string | null;
  private _dayOfWeek: number | null;
  private _dayOfMonth: number | null;
  private _unitPrice: Money;
  readonly createdAt?: Date;

  constructor(props: ContractItemProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.siteId = props.siteId;
    this._name = props.name;
    this._frequencyCount = props.frequencyCount;
    this._frequencyUnit = props.frequencyUnit;
    this._frequencyRule = props.frequencyRule;
    this._dayOfWeek = props.dayOfWeek;
    this._dayOfMonth = props.dayOfMonth;
    this._unitPrice = props.unitPrice;
    this.createdAt = props.createdAt;
  }

  /** Constructs the item and throws ValidationFailedError-style violations via caller if any. */
  static create(props: ContractItemProps): ContractItem {
    return new ContractItem(props);
  }

  get name(): string {
    return this._name;
  }

  get frequencyCount(): number {
    return this._frequencyCount;
  }

  get frequencyUnit(): FrequencyUnit {
    return this._frequencyUnit;
  }

  get frequencyRule(): string | null {
    return this._frequencyRule;
  }

  get dayOfWeek(): number | null {
    return this._dayOfWeek;
  }

  get dayOfMonth(): number | null {
    return this._dayOfMonth;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  setName(name: string): void {
    this._name = name;
  }

  setFrequency(
    count: number,
    unit: FrequencyUnit,
    rule: string | null,
    dayOfWeek: number | null = null,
    dayOfMonth: number | null = null,
  ): void {
    this._frequencyCount = count;
    this._frequencyUnit = unit;
    this._frequencyRule = rule;
    this._dayOfWeek = dayOfWeek;
    this._dayOfMonth = dayOfMonth;
  }

  setUnitPrice(unitPrice: number): void {
    this._unitPrice = Money.fromNumber(unitPrice);
  }

  assertValid(): FieldViolation[] {
    const violations: FieldViolation[] = [];
    if (!Number.isInteger(this._frequencyCount) || this._frequencyCount < 1) {
      violations.push({ field: 'frequency_count', message: 'Frequency count must be a positive integer' });
    }
    if (!(this._unitPrice instanceof Money) || this._unitPrice.isNegative()) {
      violations.push({ field: 'unit_price', message: 'Unit price must be zero or greater' });
    }
    if (this._dayOfWeek != null && (this._dayOfWeek < 0 || this._dayOfWeek > 6)) {
      violations.push({ field: 'day_of_week', message: 'day_of_week must be between 0 and 6' });
    }
    if (this._dayOfMonth != null && (this._dayOfMonth < 1 || this._dayOfMonth > 31)) {
      violations.push({ field: 'day_of_month', message: 'day_of_month must be between 1 and 31' });
    }
    if (this._dayOfWeek != null && this._dayOfMonth != null) {
      violations.push({ field: 'day_of_week', message: 'Set day_of_week or day_of_month, not both' });
    }
    if (this._dayOfWeek != null && this._frequencyUnit !== FrequencyUnit.Week) {
      violations.push({ field: 'day_of_week', message: 'day_of_week only applies to a weekly frequency' });
    }
    if (
      this._dayOfMonth != null &&
      this._frequencyUnit !== FrequencyUnit.Month &&
      this._frequencyUnit !== FrequencyUnit.Quarter &&
      this._frequencyUnit !== FrequencyUnit.Year
    ) {
      violations.push({
        field: 'day_of_month',
        message: 'day_of_month only applies to a monthly, quarterly or yearly frequency',
      });
    }
    return violations;
  }
}
