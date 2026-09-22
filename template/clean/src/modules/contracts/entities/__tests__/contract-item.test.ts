import { ContractItem, FrequencyUnit } from '../contract-item';
import { Money } from '../money';

function anItem(overrides: Partial<Parameters<typeof ContractItem.create>[0]> = {}): ContractItem {
  return ContractItem.create({
    tenantId: 1,
    name: 'Mopping',
    frequencyCount: 1,
    frequencyUnit: FrequencyUnit.Week,
    frequencyRule: null,
    dayOfWeek: null,
    dayOfMonth: null,
    unitPrice: Money.fromNumber(100),
    ...overrides,
  });
}

describe('ContractItem', () => {
  it('is valid with no day_of_week/day_of_month set', () => {
    expect(anItem().assertValid()).toEqual([]);
  });

  it('accepts day_of_week when the unit is weekly', () => {
    const item = anItem({ frequencyUnit: FrequencyUnit.Week, dayOfWeek: 2 });
    expect(item.assertValid()).toEqual([]);
  });

  it('rejects day_of_week when the unit is not weekly', () => {
    const item = anItem({ frequencyUnit: FrequencyUnit.Month, dayOfWeek: 2, dayOfMonth: null });
    expect(item.assertValid()).toContainEqual({
      field: 'day_of_week',
      message: 'day_of_week only applies to a weekly frequency',
    });
  });

  it.each([FrequencyUnit.Month, FrequencyUnit.Quarter, FrequencyUnit.Year])(
    'accepts day_of_month when the unit is %s',
    (unit) => {
      const item = anItem({ frequencyUnit: unit, dayOfMonth: 15 });
      expect(item.assertValid()).toEqual([]);
    },
  );

  it('rejects day_of_month when the unit is weekly or daily', () => {
    const item = anItem({ frequencyUnit: FrequencyUnit.Day, dayOfMonth: 15, dayOfWeek: null });
    expect(item.assertValid()).toContainEqual({
      field: 'day_of_month',
      message: 'day_of_month only applies to a monthly, quarterly or yearly frequency',
    });
  });

  it('rejects setting both day_of_week and day_of_month (XOR rule)', () => {
    const item = anItem({ frequencyUnit: FrequencyUnit.Month, dayOfWeek: 2, dayOfMonth: 15 });
    expect(item.assertValid()).toContainEqual({
      field: 'day_of_week',
      message: 'Set day_of_week or day_of_month, not both',
    });
  });

  it('rejects day_of_week outside 0-6', () => {
    const item = anItem({ dayOfWeek: 7 });
    expect(item.assertValid()).toContainEqual({
      field: 'day_of_week',
      message: 'day_of_week must be between 0 and 6',
    });
  });

  it('rejects day_of_month outside 1-31', () => {
    const item = anItem({ frequencyUnit: FrequencyUnit.Month, dayOfMonth: 32 });
    expect(item.assertValid()).toContainEqual({
      field: 'day_of_month',
      message: 'day_of_month must be between 1 and 31',
    });
  });

  it('rejects a non-positive or non-integer frequency count', () => {
    expect(anItem({ frequencyCount: 0 }).assertValid()).toContainEqual({
      field: 'frequency_count',
      message: 'Frequency count must be a positive integer',
    });
    expect(anItem({ frequencyCount: 1.5 }).assertValid()).toContainEqual({
      field: 'frequency_count',
      message: 'Frequency count must be a positive integer',
    });
  });

  it('rejects a negative unit price', () => {
    const item = anItem({ unitPrice: Money.fromNumber(-1) });
    expect(item.assertValid()).toContainEqual({
      field: 'unit_price',
      message: 'Unit price must be zero or greater',
    });
  });

  it('setFrequency replaces the frequency fields together, in one call', () => {
    const item = anItem();
    item.setFrequency(2, FrequencyUnit.Month, 'custom rule', null, 10);
    expect(item.frequencyCount).toBe(2);
    expect(item.frequencyUnit).toBe(FrequencyUnit.Month);
    expect(item.frequencyRule).toBe('custom rule');
    expect(item.dayOfMonth).toBe(10);
    expect(item.assertValid()).toEqual([]);
  });
});
