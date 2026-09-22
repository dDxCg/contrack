import { DateRange } from './value-objects/date-range';
import { Frequency, isMonthlyGrained } from './value-objects/frequency';
import { FrequencyUnit } from './value-objects/frequency-unit';

/**
 * ScheduleGeneratorDomainService — ported near-verbatim from
 * backend/services/contracts/schedule-generator.service.ts.
 *
 * The original was already pure date math with no injected framework
 * dependency (it wasn't even using its @Injectable() decorator for
 * anything but DI wiring), so this port only does two things differently:
 *   1. Takes a DateRange + Frequency value object instead of anonymous
 *      `Term`/`FrequencyInput` interfaces.
 *   2. Drops the @Injectable() decorator — domain/ has zero framework
 *      dependencies, so this is a plain class the application layer
 *      `new`s up directly.
 * The three generation strategies (day-of-week anchored, day-of-month
 * snapped/clamped, plain interval) and all of their date arithmetic are
 * unchanged.
 */
export class ScheduleGeneratorDomainService {
  generate(range: DateRange, frequency: Frequency): Date[] {
    if (range.isEmpty()) {
      return [];
    }
    if (frequency.unit === FrequencyUnit.Week && frequency.dayOfWeek != null) {
      return this.generateByDayOfWeek(range, frequency.count, frequency.dayOfWeek);
    }
    if (isMonthlyGrained(frequency.unit) && frequency.dayOfMonth != null) {
      return this.generateByDayOfMonth(range, frequency.unit, frequency.count, frequency.dayOfMonth);
    }
    return this.generateByInterval(range, frequency.unit, frequency.count);
  }

  private generateByInterval(range: DateRange, unit: FrequencyUnit, count: number): Date[] {
    const dates: Date[] = [];
    let current = range.from;
    while (current.getTime() <= range.to.getTime()) {
      dates.push(current);
      current = this.addUnit(current, unit, count);
    }
    return dates;
  }

  private generateByDayOfWeek(range: DateRange, count: number, dayOfWeek: number): Date[] {
    const stepDays = count * 7;
    const offset = (dayOfWeek - range.from.getUTCDay() + 7) % 7;
    const dates: Date[] = [];
    let current = this.addDays(range.from, offset);
    while (current.getTime() <= range.to.getTime()) {
      dates.push(current);
      current = this.addDays(current, stepDays);
    }
    return dates;
  }

  private generateByDayOfMonth(range: DateRange, unit: FrequencyUnit, count: number, dayOfMonth: number): Date[] {
    const monthsPerStep = monthsPerStepOf(unit, count);
    const dates: Date[] = [];
    let monthOffset = 0;
    let candidate = this.snapToDayOfMonth(range.from, monthOffset, dayOfMonth);
    if (candidate.getTime() < range.from.getTime()) {
      monthOffset += monthsPerStep;
      candidate = this.snapToDayOfMonth(range.from, monthOffset, dayOfMonth);
    }
    while (candidate.getTime() <= range.to.getTime()) {
      dates.push(candidate);
      monthOffset += monthsPerStep;
      candidate = this.snapToDayOfMonth(range.from, monthOffset, dayOfMonth);
    }
    return dates;
  }

  private snapToDayOfMonth(base: Date, monthOffset: number, dayOfMonth: number): Date {
    const year = base.getUTCFullYear();
    const month = base.getUTCMonth() + monthOffset;
    const day = Math.min(dayOfMonth, daysInMonth(year, month));
    return new Date(Date.UTC(year, month, day));
  }

  private addUnit(date: Date, unit: FrequencyUnit, count: number): Date {
    switch (unit) {
      case FrequencyUnit.Day:
        return this.addDays(date, count);
      case FrequencyUnit.Week:
        return this.addDays(date, count * 7);
      case FrequencyUnit.Month:
      case FrequencyUnit.Quarter:
      case FrequencyUnit.Year:
        return this.addMonthsClamped(date, monthsPerStepOf(unit, count));
    }
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private addMonthsClamped(date: Date, months: number): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + months;
    const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
    return new Date(Date.UTC(year, month, day));
  }
}

function monthsPerStepOf(unit: FrequencyUnit, count: number): number {
  switch (unit) {
    case FrequencyUnit.Quarter:
      return count * 3;
    case FrequencyUnit.Year:
      return count * 12;
    default:
      return count;
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
