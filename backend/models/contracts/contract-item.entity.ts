import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
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
@Unique('uq_contract_items_id_tenant', ['id', 'tenantId'])
@Check('ck_contract_items_day_of_week_range', 'day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6')
@Check('ck_contract_items_day_of_month_range', 'day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31')
@Check('ck_contract_items_day_constraint_exclusive', 'day_of_week IS NULL OR day_of_month IS NULL')
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
  @JoinColumn([
    { name: 'site_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_contract_items_site' },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_contract_items_site',
    },
  ])
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
  @Column({ name: 'day_of_week', type: 'smallint', nullable: true })
  dayOfWeek!: number | null;
  @Column({ name: 'day_of_month', type: 'smallint', nullable: true })
  dayOfMonth!: number | null;
  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
  unitPrice!: Money;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  frequencyUnit!: FrequencyUnit;
  setName(name: string): void {
    this.name = name;
  }
  setFrequency(
    count: number,
    unit: FrequencyUnit,
    rule: string | null,
    dayOfWeek: number | null = null,
    dayOfMonth: number | null = null,
  ): void {
    this.frequencyCount = count;
    this.frequencyUnit = unit;
    this.frequencyRule = rule;
    this.dayOfWeek = dayOfWeek;
    this.dayOfMonth = dayOfMonth;
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
    if (this.dayOfWeek != null && this.dayOfMonth != null) {
      violations.push({ field: 'day_of_week', message: 'Set day_of_week or day_of_month, not both' });
    }
    if (this.dayOfWeek != null && this.frequencyUnit !== FrequencyUnit.Week) {
      violations.push({ field: 'day_of_week', message: 'day_of_week only applies to a weekly frequency' });
    }
    if (
      this.dayOfMonth != null &&
      this.frequencyUnit !== FrequencyUnit.Month &&
      this.frequencyUnit !== FrequencyUnit.Quarter &&
      this.frequencyUnit !== FrequencyUnit.Year
    ) {
      violations.push({
        field: 'day_of_month',
        message: 'day_of_month only applies to a monthly, quarterly or yearly frequency',
      });
    }
    return violations;
  }
}
