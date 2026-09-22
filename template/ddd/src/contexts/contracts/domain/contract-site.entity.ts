import { ContractItem } from './contract-item.entity';

/**
 * ContractSite — entity local to the Contract aggregate.
 *
 * Ported from backend/models/contracts/contract-site.entity.ts. Owns its
 * ContractItem collection: items can only be added/removed through the
 * site, never spliced in from outside, which is what keeps "every site has
 * >= 1 item" enforceable at the aggregate boundary during contract
 * creation (see Contract.create in contract.aggregate.ts).
 */
export class ContractSite {
  private readonly _items: ContractItem[];

  private constructor(
    private _id: number | null,
    private _name: string,
    private _workRequirements: string | null,
    private _notes: string | null,
    private _latitude: number | null,
    private _longitude: number | null,
    private _radiusMeters: number,
    items: ContractItem[],
  ) {
    this._items = [...items];
  }

  static create(params: {
    id?: number | null;
    name: string;
    workRequirements?: string | null;
    notes?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number;
    items?: ContractItem[];
  }): ContractSite {
    return new ContractSite(
      params.id ?? null,
      params.name,
      params.workRequirements ?? null,
      params.notes ?? null,
      params.latitude ?? null,
      params.longitude ?? null,
      params.radiusMeters ?? 200,
      params.items ?? [],
    );
  }

  get id(): number | null {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get workRequirements(): string | null {
    return this._workRequirements;
  }

  get notes(): string | null {
    return this._notes;
  }

  get latitude(): number | null {
    return this._latitude;
  }

  get longitude(): number | null {
    return this._longitude;
  }

  get radiusMeters(): number {
    return this._radiusMeters;
  }

  get items(): readonly ContractItem[] {
    return this._items;
  }

  assignId(id: number): void {
    if (this._id !== null) {
      throw new Error(`ContractSite already has id ${this._id}`);
    }
    this._id = id;
  }

  addItem(item: ContractItem): void {
    this._items.push(item);
  }

  rename(name: string): void {
    this._name = name;
  }

  updateDetails(params: { workRequirements: string | null; notes: string | null }): void {
    this._workRequirements = params.workRequirements;
    this._notes = params.notes;
  }

  updateLocation(params: { latitude: number | null; longitude: number | null; radiusMeters: number }): void {
    this._latitude = params.latitude;
    this._longitude = params.longitude;
    this._radiusMeters = params.radiusMeters;
  }
}
