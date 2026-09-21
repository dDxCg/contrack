import { Injectable } from '@nestjs/common';
import { FrequencyUnit } from '../../models/contracts/contract-item.entity';
export interface Term {
  from: Date;
  to: Date;
}
export interface FrequencyInput {
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
}
@Injectable()
export class ScheduleGeneratorService {
  generate(term: Term, frequency: FrequencyInput): Date[] {
    if (term.to.getTime() < term.from.getTime()) {
      return [];
    }
    if (frequency.frequencyUnit === FrequencyUnit.Week && frequency.dayOfWeek != null) {
      return this.generateByDayOfWeek(term, frequency.frequencyCount, frequency.dayOfWeek);
    }
    if (isMonthlyGrained(frequency.frequencyUnit) && frequency.dayOfMonth != null) {
      return this.generateByDayOfMonth(
        term,
        frequency.frequencyUnit,
        frequency.frequencyCount,
        frequency.dayOfMonth,
      );
    }
    return this.generateByInterval(term, frequency.frequencyUnit, frequency.frequencyCount);
  }
  private generateByInterval(term: Term, unit: FrequencyUnit, count: number): Date[] {
    const dates: Date[] = [];
    let current = term.from;
    while (current.getTime() <= term.to.getTime()) {
      dates.push(current);
      current = this.addUnit(current, unit, count);
    }
    return dates;
  }
  private generateByDayOfWeek(term: Term, count: number, dayOfWeek: number): Date[] {
    const stepDays = count * 7;
    const offset = (dayOfWeek - term.from.getUTCDay() + 7) % 7;
    const dates: Date[] = [];
    let current = this.addDays(term.from, offset);
    while (current.getTime() <= term.to.getTime()) {
      dates.push(current);
      current = this.addDays(current, stepDays);
    }
    return dates;
  }
  private generateByDayOfMonth(term: Term, unit: FrequencyUnit, count: number, dayOfMonth: number): Date[] {
    const monthsPerStep = monthsPerStepOf(unit, count);
    const dates: Date[] = [];
    let monthOffset = 0;
    let candidate = this.snapToDayOfMonth(term.from, monthOffset, dayOfMonth);
    if (candidate.getTime() < term.from.getTime()) {
      monthOffset += monthsPerStep;
      candidate = this.snapToDayOfMonth(term.from, monthOffset, dayOfMonth);
    }
    while (candidate.getTime() <= term.to.getTime()) {
      dates.push(candidate);
      monthOffset += monthsPerStep;
      candidate = this.snapToDayOfMonth(term.from, monthOffset, dayOfMonth);
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
function isMonthlyGrained(unit: FrequencyUnit): boolean {
  return unit === FrequencyUnit.Month || unit === FrequencyUnit.Quarter || unit === FrequencyUnit.Year;
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
