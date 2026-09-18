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
});

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
