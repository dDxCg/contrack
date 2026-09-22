import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractSiteOrmEntity } from './contract-site.orm-entity';

/**
 * ContractOrmEntity — infrastructure/persistence model.
 *
 * This is deliberately a SEPARATE class from the domain Contract aggregate
 * (contexts/contracts/domain/contract.aggregate.ts). TypeORM decorators,
 * column types and relations live only here; the domain aggregate never
 * imports `typeorm`. contract.persistence-mapper.ts converts between the
 * two explicitly in both directions.
 *
 * Simplified vs. backend/models/contracts/contract.entity.ts: status is
 * stored as a plain varchar instead of a `status_id` foreign key into a
 * `contract_statuses` lookup table, and there is no Tenant/Customer
 * relation — this reference port doesn't model the tenants/customers
 * bounded contexts, so tenant_id/customer_id are plain integers.
 */
@Entity('contracts')
export class ContractOrmEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Column({ name: 'customer_id', type: 'integer' })
  customerId!: number;

  @Column({ name: 'signed_at', type: 'date' })
  signedAt!: string;

  @Column({ name: 'expires_at', type: 'date' })
  expiresAt!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => ContractSiteOrmEntity, (site) => site.contract, { cascade: true })
  sites!: ContractSiteOrmEntity[];
}
