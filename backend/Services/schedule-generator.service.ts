import { Injectable } from '@nestjs/common';
import { FrequencyUnit } from '../Models/contract-item.entity';

export interface Term {
  from: Date;
  to: Date;
}

export interface FrequencyInput {
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
}

@Injectable()
export class ScheduleGeneratorService {
  generate(term: Term, frequency: FrequencyInput): Date[] {
    const dates: Date[] = [];
    let current = term.from;

    while (current.getTime() <= term.to.getTime()) {
      dates.push(current);
      current = this.addUnit(current, frequency.frequencyUnit, frequency.frequencyCount);
    }

    return dates;
  }

  private addUnit(date: Date, unit: FrequencyUnit, count: number): Date {
    const next = new Date(date);

    switch (unit) {
      case FrequencyUnit.Day:
        next.setUTCDate(next.getUTCDate() + count);
        break;
      case FrequencyUnit.Week:
        next.setUTCDate(next.getUTCDate() + count * 7);
        break;
      case FrequencyUnit.Month:
        next.setUTCMonth(next.getUTCMonth() + count);
        break;
      case FrequencyUnit.Quarter:
        next.setUTCMonth(next.getUTCMonth() + count * 3);
        break;
      case FrequencyUnit.Year:
        next.setUTCFullYear(next.getUTCFullYear() + count);
        break;
    }

    return next;
  }
}
