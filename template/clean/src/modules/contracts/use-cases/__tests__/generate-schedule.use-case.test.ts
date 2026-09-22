import { GenerateScheduleUseCase } from '../generate-schedule.use-case';
import { FrequencyUnit } from '../../entities/contract-item';

function isoDates(dates: Date[]): string[] {
  return dates.map((d) => d.toISOString().slice(0, 10));
}

describe('GenerateScheduleUseCase — date math ported from schedule-generator.service.ts', () => {
  it('generates weekly occurrences anchored to the requested day of week', () => {
    const useCase = new GenerateScheduleUseCase();
    // 2026-01-01 is a Thursday (day 4). Anchoring to Monday (1) should first land on 2026-01-05.
    const { dates } = useCase.execute({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T00:00:00.000Z'),
      frequencyCount: 1,
      frequencyUnit: FrequencyUnit.Week,
      dayOfWeek: 1,
      dayOfMonth: null,
    });
    expect(isoDates(dates)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
  });

  it('generates monthly occurrences snapped/clamped to the requested day of month', () => {
    const useCase = new GenerateScheduleUseCase();
    // Day 31 clamps to the last day of February.
    const { dates } = useCase.execute({
      from: new Date('2026-01-15T00:00:00.000Z'),
      to: new Date('2026-04-01T00:00:00.000Z'),
      frequencyCount: 1,
      frequencyUnit: FrequencyUnit.Month,
      dayOfWeek: null,
      dayOfMonth: 31,
    });
    expect(isoDates(dates)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('falls back to a plain interval when no day-of-week/day-of-month anchor is given', () => {
    const useCase = new GenerateScheduleUseCase();
    const { dates } = useCase.execute({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-10T00:00:00.000Z'),
      frequencyCount: 3,
      frequencyUnit: FrequencyUnit.Day,
      dayOfWeek: null,
      dayOfMonth: null,
    });
    expect(isoDates(dates)).toEqual(['2026-01-01', '2026-01-04', '2026-01-07', '2026-01-10']);
  });

  it('returns an empty schedule when the term is inverted', () => {
    const useCase = new GenerateScheduleUseCase();
    const { dates } = useCase.execute({
      from: new Date('2026-02-01T00:00:00.000Z'),
      to: new Date('2026-01-01T00:00:00.000Z'),
      frequencyCount: 1,
      frequencyUnit: FrequencyUnit.Day,
      dayOfWeek: null,
      dayOfMonth: null,
    });
    expect(dates).toEqual([]);
  });
});
