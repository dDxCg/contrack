import { Money } from '../money';

describe('Money', () => {
  it('rounds to 2 decimal places using half-up rounding', () => {
    expect(Money.fromNumber(1.005).toFixed()).toBe('1.01');
    expect(Money.fromNumber(1.004).toFixed()).toBe('1.00');
    expect(Money.fromString('2.345').toFixed()).toBe('2.35');
  });

  it('adds and subtracts preserving 2-decimal rounding', () => {
    const sum = Money.fromNumber(10.1).add(Money.fromNumber(0.2));
    expect(sum.toFixed()).toBe('10.30');
    const diff = Money.fromNumber(10).subtract(Money.fromNumber(0.05));
    expect(diff.toFixed()).toBe('9.95');
  });

  it('sumOf accepts a mix of numbers and Money', () => {
    const total = Money.sumOf([1, Money.fromNumber(2.5), 0.5]);
    expect(total.toFixed()).toBe('4.00');
  });

  it('allocate distributes remainder cents to the first shares', () => {
    const shares = Money.fromNumber(10).allocate(3);
    expect(shares.map((s) => s.toFixed())).toEqual(['3.34', '3.33', '3.33']);
  });

  it('rejects a non-positive or non-integer allocate() count', () => {
    expect(() => Money.fromNumber(10).allocate(0)).toThrow();
    expect(() => Money.fromNumber(10).allocate(1.5)).toThrow();
  });

  it('isNegative/isZero/equals', () => {
    expect(Money.fromNumber(-1).isNegative()).toBe(true);
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.fromNumber(5).equals(Money.fromString('5.00'))).toBe(true);
  });
});
