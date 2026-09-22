import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// frequency_unit is stored as a plain varchar here rather than through the
// backend's `frequency_units` lookup table — same simplification as
// ContractOrmEntity's status column, for the same reason.
@Entity('contract_items')
export class ContractItemOrmEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('idx_contract_items_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Index('idx_contract_items_site')
  @Column({ name: 'site_id', type: 'integer' })
  siteId!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'frequency_count', type: 'integer' })
  frequencyCount!: number;

  @Column({ name: 'frequency_unit', type: 'varchar', length: 32 })
  frequencyUnit!: string;

  @Column({ name: 'frequency_rule', type: 'varchar', length: 255, nullable: true })
  frequencyRule!: string | null;

  @Column({ name: 'day_of_week', type: 'smallint', nullable: true })
  dayOfWeek!: number | null;

  @Column({ name: 'day_of_month', type: 'smallint', nullable: true })
  dayOfMonth!: number | null;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
