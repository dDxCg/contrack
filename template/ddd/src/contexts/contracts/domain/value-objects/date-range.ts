/**
 * DateRange — the `Term { from, to }` shape used throughout
 * backend/services/contracts/schedule-generator.service.ts, promoted to a
 * proper value object. A contract's signed/expiry dates and the generator's
 * scheduling window are the same concept, so it is named and typed once
 * here instead of being an anonymous `{ from: Date; to: Date }` scattered
 * across the codebase.
 */
export class DateRange {
  private constructor(
    readonly from: Date,
    readonly to: Date,
  ) {}

  static of(from: Date, to: Date): DateRange {
    if (Number.isNaN(from.getTime())) {
      throw new Error('DateRange "from" is not a valid date');
    }
    if (Number.isNaN(to.getTime())) {
      throw new Error('DateRange "to" is not a valid date');
    }
    return new DateRange(from, to);
  }

  /** True when `to` is before `from` — the generator treats this as an empty range, not an error. */
  isEmpty(): boolean {
    return this.to.getTime() < this.from.getTime();
  }

  contains(date: Date): boolean {
    return date.getTime() >= this.from.getTime() && date.getTime() <= this.to.getTime();
  }
}
