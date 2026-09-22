import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';
import { ScheduleGeneratorService } from '../../../services/contracts/schedule-generator.service';

describe('ScheduleGeneratorService.generate — FR22', () => {
  const service = new ScheduleGeneratorService();
  it('generates one date per day for a daily frequency', () => {
    const dates = service.generate(
      { from: new Date('2024-01-01'), to: new Date('2024-01-04') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Day },
    );
    expect(dates.map(iso)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04']);
  });
  it('generates one date every N weeks for a weekly frequency', () => {
    const dates = service.generate(
      { from: new Date('2024-01-01'), to: new Date('2024-01-22') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Week },
    );
    expect(dates.map(iso)).toEqual(['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22']);
  });
  it('spaces occurrences by frequencyCount units, not always 1', () => {
    const dates = service.generate(
      { from: new Date('2024-01-01'), to: new Date('2024-01-29') },
      { frequencyCount: 2, frequencyUnit: FrequencyUnit.Week },
    );
    expect(dates.map(iso)).toEqual(['2024-01-01', '2024-01-15', '2024-01-29']);
  });
  it('generates one date per calendar month for a monthly frequency', () => {
    const dates = service.generate(
      { from: new Date('2024-01-10'), to: new Date('2024-04-10') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Month },
    );
    expect(dates.map(iso)).toEqual(['2024-01-10', '2024-02-10', '2024-03-10', '2024-04-10']);
  });
  it('generates one date per quarter for a quarterly frequency', () => {
    const dates = service.generate(
      { from: new Date('2024-01-10'), to: new Date('2024-07-10') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Quarter },
    );
    expect(dates.map(iso)).toEqual(['2024-01-10', '2024-04-10', '2024-07-10']);
  });
  it('generates one date per year for a yearly frequency', () => {
    const dates = service.generate(
      { from: new Date('2024-01-10'), to: new Date('2026-01-10') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Year },
    );
    expect(dates.map(iso)).toEqual(['2024-01-10', '2025-01-10', '2026-01-10']);
  });
  it('generates exactly the start date when the term is shorter than one interval', () => {
    const dates = service.generate(
      { from: new Date('2024-01-01'), to: new Date('2024-01-01') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Month },
    );
    expect(dates.map(iso)).toEqual(['2024-01-01']);
  });
  it('generates nothing when the term ends before it starts', () => {
    const dates = service.generate(
      { from: new Date('2024-02-01'), to: new Date('2024-01-01') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Day },
    );
    expect(dates).toEqual([]);
  });
  it('clamps to the target month’s last day instead of rolling into the next month (overflow bug)', () => {
    const dates = service.generate(
      { from: new Date('2024-01-31'), to: new Date('2024-04-30') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Month },
    );
    expect(dates.map(iso)).toEqual(['2024-01-31', '2024-02-29', '2024-03-29', '2024-04-29']);
  });
  it('clamps a yearly Feb 29 anchor to Feb 28 in a non-leap year', () => {
    const dates = service.generate(
      { from: new Date('2024-02-29'), to: new Date('2026-02-28') },
      { frequencyCount: 1, frequencyUnit: FrequencyUnit.Year },
    );
    expect(dates.map(iso)).toEqual(['2024-02-29', '2025-02-28', '2026-02-28']);
  });
  describe('day_of_week constraint (D18)', () => {
    it('snaps every occurrence to the given weekday instead of stepping from signed_at', () => {
      const dates = service.generate(
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        { frequencyCount: 1, frequencyUnit: FrequencyUnit.Week, dayOfWeek: 6 },
      );
      expect(dates.map(iso)).toEqual(['2024-01-06', '2024-01-13', '2024-01-20', '2024-01-27']);
    });
    it('spaces weekday occurrences by frequencyCount weeks', () => {
      const dates = service.generate(
        { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        { frequencyCount: 2, frequencyUnit: FrequencyUnit.Week, dayOfWeek: 6 },
      );
      expect(dates.map(iso)).toEqual(['2024-01-06', '2024-01-20']);
    });
    it('is ignored outside a weekly frequency', () => {
      const dates = service.generate(
        { from: new Date('2024-01-01'), to: new Date('2024-01-04') },
        { frequencyCount: 1, frequencyUnit: FrequencyUnit.Day, dayOfWeek: 6 },
      );
      expect(dates.map(iso)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04']);
    });
  });
  describe('day_of_month constraint (D18)', () => {
    it('snaps every occurrence to the given day-of-month', () => {
      const dates = service.generate(
        { from: new Date('2024-01-01'), to: new Date('2024-04-01') },
        { frequencyCount: 1, frequencyUnit: FrequencyUnit.Month, dayOfMonth: 15 },
      );
      expect(dates.map(iso)).toEqual(['2024-01-15', '2024-02-15', '2024-03-15']);
    });
    it('skips forward one period when the anchor month’s day has already passed', () => {
      const dates = service.generate(
        { from: new Date('2024-01-20'), to: new Date('2024-03-01') },
        { frequencyCount: 1, frequencyUnit: FrequencyUnit.Month, dayOfMonth: 5 },
      );
      expect(dates.map(iso)).toEqual(['2024-02-05']);
    });
    it('clamps to the target month’s last day when it is shorter than day_of_month', () => {
      const dates = service.generate(
        { from: new Date('2024-01-31'), to: new Date('2024-04-30') },
        { frequencyCount: 1, frequencyUnit: FrequencyUnit.Month, dayOfMonth: 31 },
      );
      expect(dates.map(iso)).toEqual(['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']);
    });
    it('applies to a quarterly frequency, stepping 3 months at a time', () => {
      const dates = service.generate(
        { from: new Date('2024-01-01'), to: new Date('2024-10-01') },
        { frequencyCount: 1, frequencyUnit: FrequencyUnit.Quarter, dayOfMonth: 15 },
      );
      expect(dates.map(iso)).toEqual(['2024-01-15', '2024-04-15', '2024-07-15']);
    });
  });
});

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
