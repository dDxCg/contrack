import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractSiteOrmEntity } from './contract-site.orm-entity';

/**
 * ContractItemOrmEntity — infrastructure/persistence model for ContractItem.
 *
 * Simplified vs. backend/models/contracts/contract-item.entity.ts:
 * frequency_unit is stored as a plain varchar instead of a
 * `frequency_unit_id` foreign key into a `frequency_units` lookup table,
 * and the day_of_week/day_of_month CHECK constraints are not declared at
 * the schema level — they are enforced once, authoritatively, by the
 * domain Frequency value object (contexts/contracts/domain/value-objects/
 * frequency.ts) before a row is ever written.
 */
@Entity('contract_items')
export class ContractItemOrmEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Index()
  @Column({ name: 'site_id', type: 'integer' })
  siteId!: number;

  @ManyToOne(() => ContractSiteOrmEntity, (site) => site.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site?: ContractSiteOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'frequency_count', type: 'integer' })
  frequencyCount!: number;

  @Column({ name: 'frequency_unit', type: 'varchar', length: 20 })
  frequencyUnit!: string;

  @Column({ name: 'frequency_rule', type: 'varchar', length: 255, nullable: true })
  frequencyRule!: string | null;

  @Column({ name: 'day_of_week', type: 'smallint', nullable: true })
  dayOfWeek!: number | null;

  @Column({ name: 'day_of_month', type: 'smallint', nullable: true })
  dayOfMonth!: number | null;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
