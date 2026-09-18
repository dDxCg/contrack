import { Money } from '../../../utils/money';
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
});
