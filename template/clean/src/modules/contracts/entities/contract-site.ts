import { ContractItem } from './contract-item';

// Ported from backend/models/contracts/contract-site.entity.ts, minus TypeORM
// decorators. Holds its items in-memory as part of the Contract aggregate;
// persistence (assigning ids, foreign keys) is a frameworks-drivers concern.
export interface ContractSiteProps {
  id?: number;
  tenantId: number;
  contractId?: number;
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  items?: ContractItem[];
  createdAt?: Date;
}

export class ContractSite {
  readonly id?: number;
  readonly tenantId: number;
  contractId?: number;
  private _name: string;
  private _workRequirements: string | null;
  private _notes: string | null;
  private _latitude: number | null;
  private _longitude: number | null;
  private _radiusMeters: number;
  private _items: ContractItem[];
  readonly createdAt?: Date;

  constructor(props: ContractSiteProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.contractId = props.contractId;
    this._name = props.name;
    this._workRequirements = props.workRequirements;
    this._notes = props.notes;
    this._latitude = props.latitude;
    this._longitude = props.longitude;
    this._radiusMeters = props.radiusMeters;
    this._items = props.items ?? [];
    this.createdAt = props.createdAt;
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

  setName(name: string): void {
    this._name = name;
  }

  setWorkRequirements(workRequirements: string | null): void {
    this._workRequirements = workRequirements;
  }

  setNotes(notes: string | null): void {
    this._notes = notes;
  }

  setLocation(latitude: number | null, longitude: number | null, radiusMeters: number): void {
    this._latitude = latitude;
    this._longitude = longitude;
    this._radiusMeters = radiusMeters;
  }

  addItem(item: ContractItem): void {
    this._items.push(item);
  }
}
