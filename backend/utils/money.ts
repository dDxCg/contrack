export class Money {
  private constructor(private readonly cents: number) {}
  static fromNumber(value: number): Money {
    return new Money(Math.round(value * 100));
  }
  static zero(): Money {
    return new Money(0);
  }
  static sumOf(values: readonly number[]): Money {
    return values.reduce((sum, value) => sum.add(Money.fromNumber(value)), Money.zero());
  }
  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }
  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }
  toNumber(): number {
    return this.cents / 100;
  }
}
