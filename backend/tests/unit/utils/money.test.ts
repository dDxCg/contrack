import { Money, moneyTransformer } from '../../../utils/money';

describe('Money — exact decimal arithmetic for VND amounts, no float drift', () => {
  it('adds without the classic float error', () => {
    expect(Money.fromNumber(0.1).add(Money.fromNumber(0.2)).toNumber()).toBe(0.3);
  });
  it('sums a long run of amounts exactly, unlike a plain reduce', () => {
    const amounts = Array.from({ length: 1000 }, () => 0.1);
    expect(Money.sumOf(amounts).toNumber()).toBe(100);
  });
  it('sums whole-dong amounts exactly at realistic scale', () => {
    expect(Money.sumOf([500000, 1200000, 250000]).toNumber()).toBe(1950000);
  });
  it('subtracts', () => {
    expect(Money.fromNumber(1950000).subtract(Money.fromNumber(1200000)).toNumber()).toBe(750000);
  });
  it('treats zero as the additive identity', () => {
    expect(Money.zero().add(Money.fromNumber(42)).toNumber()).toBe(42);
  });
  it('sums an empty list to zero', () => {
    expect(Money.sumOf([]).toNumber()).toBe(0);
  });
  it('rounds to the nearest cent on construction, not on every operation', () => {
    expect(Money.fromNumber(10.005).toNumber()).toBe(10.01);
  });
  it('reads the exact string Postgres sends for a numeric column, no float parsing', () => {
    expect(Money.fromString('1950000.00').toNumber()).toBe(1950000);
    expect(Money.fromString('0150.00').toNumber()).toBe(150);
  });
  it('multiplies by a plain ratio', () => {
    expect(Money.fromNumber(200).multiply(1.5).toNumber()).toBe(300);
  });
  it('divides and rounds the result to the nearest cent', () => {
    expect(Money.fromNumber(100).divide(3).toNumber()).toBe(33.33);
  });
  it('allocates a total into equal shares that sum back to the original, remainder to the first shares', () => {
    const shares = Money.fromNumber(100).allocate(3);
    expect(shares.map((share) => share.toNumber())).toEqual([33.34, 33.33, 33.33]);
    expect(Money.sumOf(shares).toNumber()).toBe(100);
  });
  describe('moneyTransformer — the TypeORM column boundary', () => {
    it('writes a fixed 2-decimal string, matching numeric(14,2)', () => {
      expect(moneyTransformer.to(Money.fromNumber(1950000))).toBe('1950000.00');
    });
    it('passes null/undefined through unchanged', () => {
      expect(moneyTransformer.to(null)).toBeNull();
      expect(moneyTransformer.from(null)).toBeNull();
    });
    it('reads the numeric string back into a Money, not a float', () => {
      const money = moneyTransformer.from('1950000.00') as Money;
      expect(money.toNumber()).toBe(1950000);
    });
  });
});
