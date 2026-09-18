import {
  addMonthsUTC,
  startOfMonthInZone,
  startOfMonthUTC,
  toDateString,
  toDateStringInZone,
} from '../../../utils/period';

describe('addMonthsUTC', () => {
  it('preserves the day of month when the target month has enough days', () => {
    expect(toDateString(addMonthsUTC(new Date('2024-01-15T00:00:00.000Z'), 1))).toBe('2024-02-15');
  });

  it('clamps to the last valid day when the target month is shorter (D11)', () => {
    expect(toDateString(addMonthsUTC(new Date('2026-01-31T00:00:00.000Z'), 1))).toBe('2026-02-28');
  });

  it('clamps to 29 February on a leap year', () => {
    expect(toDateString(addMonthsUTC(new Date('2024-01-31T00:00:00.000Z'), 1))).toBe('2024-02-29');
  });

  it('clamps across a year rollover', () => {
    expect(toDateString(addMonthsUTC(new Date('2024-12-31T00:00:00.000Z'), 2))).toBe('2025-02-28');
  });

  it('clamps going backwards too', () => {
    expect(toDateString(addMonthsUTC(new Date('2024-03-31T00:00:00.000Z'), -1))).toBe('2024-02-29');
  });

  it('never bills more than the target month by drifting into the month after', () => {
    const from = addMonthsUTC(new Date('2026-01-31T00:00:00.000Z'), 1);
    const to = addMonthsUTC(from, 1);
    expect(toDateString(from)).toBe('2026-02-28');
    expect(toDateString(to)).toBe('2026-03-28');
  });
});

describe('toDateStringInZone', () => {
  it('resolves the calendar date in the given zone, not UTC', () => {
    const lateUtc = new Date('2026-03-10T17:30:00.000Z');
    expect(toDateStringInZone(lateUtc, 'UTC')).toBe('2026-03-10');
    expect(toDateStringInZone(lateUtc, 'Asia/Ho_Chi_Minh')).toBe('2026-03-11');
  });

  it('resolves the previous calendar date near UTC midnight, seven hours behind Vietnam', () => {
    const justAfterUtcMidnight = new Date('2026-03-11T02:00:00.000Z');
    expect(toDateStringInZone(justAfterUtcMidnight, 'UTC')).toBe('2026-03-11');
    expect(toDateStringInZone(justAfterUtcMidnight, 'Asia/Ho_Chi_Minh')).toBe('2026-03-11');
  });
});

describe('startOfMonthInZone', () => {
  it('returns the first day of the month as observed in the given zone', () => {
    const start = startOfMonthInZone(new Date('2026-03-10T17:30:00.000Z'), 'Asia/Ho_Chi_Minh');
    expect(toDateString(start)).toBe('2026-03-01');
  });

  it('rolls to the next month when the zone is already past midnight on the 1st', () => {
    const lastHourOfFebInUtc = new Date('2026-02-28T18:00:00.000Z');
    expect(toDateStringInZone(lastHourOfFebInUtc, 'Asia/Ho_Chi_Minh')).toBe('2026-03-01');
    const start = startOfMonthInZone(lastHourOfFebInUtc, 'Asia/Ho_Chi_Minh');
    expect(toDateString(start)).toBe('2026-03-01');
  });

  it('agrees with startOfMonthUTC when the zone is UTC', () => {
    const now = new Date('2026-06-14T09:00:00.000Z');
    expect(toDateString(startOfMonthInZone(now, 'UTC'))).toBe(toDateString(startOfMonthUTC(now)));
  });
});
