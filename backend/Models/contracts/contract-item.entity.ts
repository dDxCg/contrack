import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FieldViolation } from '../domain-errors';
export enum FrequencyUnit {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Quarter = 'quarter',
  Year = 'year',
}
@Entity('contract_items')
export class ContractItem {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @Column({ name: 'site_id', type: 'integer' })
  siteId!: number;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ name: 'frequency_count', type: 'integer' })
  frequencyCount!: number;
  @Column({ name: 'frequency_unit_id', type: 'integer' })
  frequencyUnitId!: number;
  @Column({ name: 'frequency_rule', type: 'varchar', length: 255, nullable: true })
  frequencyRule!: string | null;
  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice!: number;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  frequencyUnit!: FrequencyUnit;
  setName(name: string): void {
    this.name = name;
  }
  setFrequency(count: number, unit: FrequencyUnit, rule: string | null): void {
    this.frequencyCount = count;
    this.frequencyUnit = unit;
    this.frequencyRule = rule;
  }
  setUnitPrice(unitPrice: number): void {
    this.unitPrice = unitPrice;
  }
  assertValid(): FieldViolation[] {
    const violations: FieldViolation[] = [];
    if (!Number.isInteger(this.frequencyCount) || this.frequencyCount < 1) {
      violations.push({ field: 'frequency_count', message: 'Frequency count must be a positive integer' });
    }
    if (typeof this.unitPrice !== 'number' || this.unitPrice < 0) {
      violations.push({ field: 'unit_price', message: 'Unit price must be zero or greater' });
    }
    return violations;
  }
}
