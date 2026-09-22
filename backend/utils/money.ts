import Big from 'big.js';
import { ValueTransformer } from 'typeorm';

Big.RM = Big.roundHalfUp;

export class Money {
  private readonly value: Big;

  private constructor(value: Big) {
    this.value = value.round(2);
  }

  static fromNumber(value: number): Money {
    return new Money(new Big(value));
  }

  static fromString(value: string): Money {
    return new Money(new Big(value));
  }

  static zero(): Money {
    return new Money(new Big(0));
  }

  static sumOf(values: readonly (number | Money)[]): Money {
    return values.reduce<Money>(
      (sum, value) => sum.add(value instanceof Money ? value : Money.fromNumber(value)),
      Money.zero(),
    );
  }

  add(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  subtract(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  multiply(factor: number | Big): Money {
    return new Money(this.value.times(factor));
  }

  divide(divisor: number | Big): Money {
    return new Money(this.value.div(divisor));
  }

  allocate(parts: number): Money[] {
    if (parts < 1 || !Number.isInteger(parts)) {
      throw new Error(`allocate() requires a positive integer, got ${parts}`);
    }

    const base = this.value.div(parts).round(2, Big.roundDown);
    const shares = Array.from({ length: parts }, () => new Money(base));
    let remainder = this.value.minus(base.times(parts));
    const cent = new Big('0.01');

    for (let i = 0; remainder.gt(0) && i < shares.length; i += 1) {
      shares[i] = shares[i].add(new Money(cent));
      remainder = remainder.minus(cent);
    }

    return shares;
  }

  isNegative(): boolean {
    return this.value.lt(0);
  }

  isZero(): boolean {
    return this.value.eq(0);
  }

  equals(other: Money): boolean {
    return this.value.eq(other.value);
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  toFixed(): string {
    return this.value.toFixed(2);
  }
}

export const moneyTransformer: ValueTransformer = {
  to: (value?: Money | null): string | null | undefined => (value == null ? value : value.toFixed()),
  from: (value?: string | null): Money | null | undefined =>
    value == null ? value : Money.fromString(value),
};
