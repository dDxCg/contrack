import { Money } from '../../src/shared-kernel/money';

describe('Money', () => {
  it('rounds to 2 decimal places using half-up rounding', () => {
    expect(Money.fromNumber(1.005).toFixed()).toBe('1.01');
    expect(Money.fromNumber(1.004).toFixed()).toBe('1.00');
    expect(Money.fromString('19.995').toFixed()).toBe('20.00');
  });

  it('adds and subtracts preserving 2-decimal rounding', () => {
    const sum = Money.fromNumber(10.1).add(Money.fromNumber(0.05));
    expect(sum.toFixed()).toBe('10.15');
    const diff = Money.fromNumber(10).subtract(Money.fromNumber(0.01));
    expect(diff.toFixed()).toBe('9.99');
  });

  it('rejects negative amounts via isNegative()', () => {
    expect(Money.fromNumber(-1).isNegative()).toBe(true);
    expect(Money.zero().isNegative()).toBe(false);
  });

  it('sumOf totals a mix of numbers and Money', () => {
    const total = Money.sumOf([Money.fromNumber(1.5), 2.25, Money.fromNumber(0.3)]);
    expect(total.toFixed()).toBe('4.05');
  });

  it('allocate() distributes remainder cents across shares without losing money', () => {
    const shares = Money.fromNumber(10).allocate(3);
    expect(shares.map((s) => s.toFixed())).toEqual(['3.34', '3.33', '3.33']);
    const total = shares.reduce((sum, s) => sum.add(s), Money.zero());
    expect(total.equals(Money.fromNumber(10))).toBe(true);
  });

  it('allocate() rejects a non-positive-integer parts count', () => {
    expect(() => Money.fromNumber(10).allocate(0)).toThrow();
    expect(() => Money.fromNumber(10).allocate(1.5)).toThrow();
  });
});
