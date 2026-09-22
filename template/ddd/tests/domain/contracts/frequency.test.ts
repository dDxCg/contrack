import { InvalidFrequencyError } from '../../../src/contexts/contracts/domain/errors';
import { Frequency } from '../../../src/contexts/contracts/domain/value-objects/frequency';
import { FrequencyUnit } from '../../../src/contexts/contracts/domain/value-objects/frequency-unit';

describe('Frequency', () => {
  it('accepts a plain interval frequency with no day constraint', () => {
    const frequency = Frequency.create({ count: 2, unit: FrequencyUnit.Week });
    expect(frequency.count).toBe(2);
    expect(frequency.dayOfWeek).toBeNull();
    expect(frequency.dayOfMonth).toBeNull();
  });

  it('accepts day_of_week only when the unit is Week', () => {
    const frequency = Frequency.create({ count: 1, unit: FrequencyUnit.Week, dayOfWeek: 3 });
    expect(frequency.dayOfWeek).toBe(3);
  });

  it('rejects day_of_week when the unit is not Week', () => {
    expect(() => Frequency.create({ count: 1, unit: FrequencyUnit.Day, dayOfWeek: 3 })).toThrow(
      InvalidFrequencyError,
    );
  });

  it.each([FrequencyUnit.Month, FrequencyUnit.Quarter, FrequencyUnit.Year])(
    'accepts day_of_month for %s frequencies',
    (unit) => {
      const frequency = Frequency.create({ count: 1, unit, dayOfMonth: 15 });
      expect(frequency.dayOfMonth).toBe(15);
    },
  );

  it('rejects day_of_month when the unit is Day or Week', () => {
    expect(() => Frequency.create({ count: 1, unit: FrequencyUnit.Week, dayOfMonth: 15 })).toThrow(
      InvalidFrequencyError,
    );
  });

  it('rejects setting both day_of_week and day_of_month (mutual exclusivity)', () => {
    expect(() =>
      Frequency.create({ count: 1, unit: FrequencyUnit.Week, dayOfWeek: 1, dayOfMonth: 1 }),
    ).toThrow(InvalidFrequencyError);
  });

  it('rejects day_of_week outside 0-6', () => {
    expect(() => Frequency.create({ count: 1, unit: FrequencyUnit.Week, dayOfWeek: 7 })).toThrow(
      InvalidFrequencyError,
    );
    expect(() => Frequency.create({ count: 1, unit: FrequencyUnit.Week, dayOfWeek: -1 })).toThrow(
      InvalidFrequencyError,
    );
  });

  it('rejects day_of_month outside 1-31', () => {
    expect(() => Frequency.create({ count: 1, unit: FrequencyUnit.Month, dayOfMonth: 32 })).toThrow(
      InvalidFrequencyError,
    );
    expect(() => Frequency.create({ count: 1, unit: FrequencyUnit.Month, dayOfMonth: 0 })).toThrow(
      InvalidFrequencyError,
    );
  });

  it('rejects a non-positive or non-integer frequency count', () => {
    expect(() => Frequency.create({ count: 0, unit: FrequencyUnit.Day })).toThrow(InvalidFrequencyError);
    expect(() => Frequency.create({ count: 1.5, unit: FrequencyUnit.Day })).toThrow(InvalidFrequencyError);
  });
});
