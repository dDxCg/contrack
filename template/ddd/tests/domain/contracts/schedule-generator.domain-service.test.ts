import { ScheduleGeneratorDomainService } from '../../../src/contexts/contracts/domain/schedule-generator.domain-service';
import { DateRange } from '../../../src/contexts/contracts/domain/value-objects/date-range';
import { Frequency } from '../../../src/contexts/contracts/domain/value-objects/frequency';
import { FrequencyUnit } from '../../../src/contexts/contracts/domain/value-objects/frequency-unit';

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe('ScheduleGeneratorDomainService', () => {
  const generator = new ScheduleGeneratorDomainService();

  it('returns no dates when the range is empty (to before from)', () => {
    const range = DateRange.of(new Date('2026-02-01'), new Date('2026-01-01'));
    const frequency = Frequency.create({ count: 1, unit: FrequencyUnit.Day });
    expect(generator.generate(range, frequency)).toEqual([]);
  });

  it('generates plain interval dates (every N days)', () => {
    const range = DateRange.of(new Date('2026-01-01'), new Date('2026-01-10'));
    const frequency = Frequency.create({ count: 3, unit: FrequencyUnit.Day });
    const dates = generator.generate(range, frequency).map(iso);
    expect(dates).toEqual(['2026-01-01', '2026-01-04', '2026-01-07', '2026-01-10']);
  });

  it('generates weekly interval dates (every N weeks) when no day_of_week is set', () => {
    const range = DateRange.of(new Date('2026-01-01'), new Date('2026-01-22'));
    const frequency = Frequency.create({ count: 1, unit: FrequencyUnit.Week });
    const dates = generator.generate(range, frequency).map(iso);
    expect(dates).toEqual(['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22']);
  });

  it('anchors to day_of_week and steps by count * 7 days', () => {
    // 2026-01-01 is a Thursday (UTC day 4). Anchoring to Monday (1) should
    // land on 2026-01-05, then every 2 weeks (14 days) after that.
    const range = DateRange.of(new Date('2026-01-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z'));
    const frequency = Frequency.create({ count: 2, unit: FrequencyUnit.Week, dayOfWeek: 1 });
    const dates = generator.generate(range, frequency).map(iso);
    expect(dates).toEqual(['2026-01-05', '2026-01-19']);
  });

  it('snaps to day_of_month, clamping to the shortest month in the step', () => {
    // day_of_month 31 must clamp to Feb 28 (2026 is not a leap year).
    const range = DateRange.of(new Date('2026-01-31T00:00:00Z'), new Date('2026-04-30T00:00:00Z'));
    const frequency = Frequency.create({ count: 1, unit: FrequencyUnit.Month, dayOfMonth: 31 });
    const dates = generator.generate(range, frequency).map(iso);
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('steps by quarter/year multiples for day_of_month generation', () => {
    const range = DateRange.of(new Date('2026-01-15T00:00:00Z'), new Date('2027-01-15T00:00:00Z'));
    const frequency = Frequency.create({ count: 1, unit: FrequencyUnit.Quarter, dayOfMonth: 15 });
    const dates = generator.generate(range, frequency).map(iso);
    expect(dates).toEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15', '2027-01-15']);
  });

  it('clamps day-of-month interval generation (Month/Quarter/Year with no day_of_month) to shorter months', () => {
    const range = DateRange.of(new Date('2026-01-31T00:00:00Z'), new Date('2026-04-30T00:00:00Z'));
    const frequency = Frequency.create({ count: 1, unit: FrequencyUnit.Month });
    const dates = generator.generate(range, frequency).map(iso);
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-28', '2026-04-28']);
  });
});
