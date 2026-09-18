import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FieldViolation } from '../domain-errors';
import { Money, moneyTransformer } from '../../utils/money';
import { FrequencyUnitLookup } from '../lookups/frequency-unit.entity';
import { Tenant } from '../tenants/tenant.entity';
import { ContractSite } from './contract-site.entity';
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
  @Index('idx_contract_items_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_contract_items_tenant' })
  tenant?: Tenant;
  @Index('idx_contract_items_site')
  @Column({ name: 'site_id', type: 'integer' })
  siteId!: number;
  @ManyToOne(() => ContractSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id', foreignKeyConstraintName: 'fk_contract_items_site' })
  site?: ContractSite;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ name: 'frequency_count', type: 'integer' })
  frequencyCount!: number;
  @Column({ name: 'frequency_unit_id', type: 'integer' })
  frequencyUnitId!: number;
  @ManyToOne(() => FrequencyUnitLookup)
  @JoinColumn({ name: 'frequency_unit_id', foreignKeyConstraintName: 'fk_contract_items_frequency_unit' })
  frequencyUnitLookup?: FrequencyUnitLookup;
  @Column({ name: 'frequency_rule', type: 'varchar', length: 255, nullable: true })
  frequencyRule!: string | null;
  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
  unitPrice!: Money;
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
    this.unitPrice = Money.fromNumber(unitPrice);
  }
  assertValid(): FieldViolation[] {
    const violations: FieldViolation[] = [];
    if (!Number.isInteger(this.frequencyCount) || this.frequencyCount < 1) {
      violations.push({ field: 'frequency_count', message: 'Frequency count must be a positive integer' });
    }
    if (!(this.unitPrice instanceof Money) || this.unitPrice.isNegative()) {
      violations.push({ field: 'unit_price', message: 'Unit price must be zero or greater' });
    }
    return violations;
  }
}
