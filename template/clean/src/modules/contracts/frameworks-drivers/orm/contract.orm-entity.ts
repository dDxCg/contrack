import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// TypeORM persistence model — distinct from entities/contract.ts's
// framework-free Contract. Deliberately simplified vs. the full backend
// schema: status is stored as a plain varchar column here instead of a
// normalized `contract_statuses` lookup table (backend/models/lookups/
// contract-status.entity.ts), so this reference port needs no seed data to
// run against pg-mem or a fresh Postgres database.
@Entity('contracts')
export class ContractOrmEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('idx_contracts_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Column({ name: 'customer_id', type: 'integer' })
  customerId!: number;

  @Column({ name: 'signed_at', type: 'date' })
  signedAt!: string;

  @Column({ name: 'expires_at', type: 'date' })
  expiresAt!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
