import { Money } from '../../../shared-kernel/money';
import { Frequency } from './value-objects/frequency';
import { FrequencyUnit } from './value-objects/frequency-unit';

/**
 * ContractItem — entity local to the Contract aggregate.
 *
 * Ported from backend/models/contracts/contract-item.entity.ts, stripped of
 * TypeORM decorators and foreign-key columns (tenantId/siteId are carried
 * by the aggregate and by infrastructure/persistence, not by the domain
 * entity itself). Identity (`id`) is optional because a freshly-created
 * item has no id until the repository persists it.
 */
export class ContractItem {
  private constructor(
    private _id: number | null,
    private _name: string,
    private _frequency: Frequency,
    private _unitPrice: Money,
  ) {}

  static create(params: {
    id?: number | null;
    name: string;
    frequency: Frequency;
    unitPrice: Money;
  }): ContractItem {
    if (params.unitPrice.isNegative()) {
      throw new Error('Unit price must be zero or greater');
    }
    return new ContractItem(params.id ?? null, params.name, params.frequency, params.unitPrice);
  }

  get id(): number | null {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get frequency(): Frequency {
    return this._frequency;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get frequencyUnit(): FrequencyUnit {
    return this._frequency.unit;
  }

  /** Called by the repository implementation right after persisting a new item. */
  assignId(id: number): void {
    if (this._id !== null) {
      throw new Error(`ContractItem already has id ${this._id}`);
    }
    this._id = id;
  }

  rename(name: string): void {
    this._name = name;
  }

  changeFrequency(frequency: Frequency): void {
    this._frequency = frequency;
  }

  changeUnitPrice(unitPrice: Money): void {
    if (unitPrice.isNegative()) {
      throw new Error('Unit price must be zero or greater');
    }
    this._unitPrice = unitPrice;
  }
}
