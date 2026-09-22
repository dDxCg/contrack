import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { ContractStatusLookup } from '../lookups/contract-status.entity';
import { Tenant } from '../tenants/tenant.entity';

export enum ContractStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Renewed = 'renewed',
}

@Entity('contracts')
@Unique('uq_contracts_id_tenant', ['id', 'tenantId'])
export class Contract {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Index('idx_contracts_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_contracts_tenant' })
  tenant?: Tenant;

  @Index('idx_contracts_customer')
  @Column({ name: 'customer_id', type: 'integer' })
  customerId!: number;

  @ManyToOne(() => Customer)
  @JoinColumn([
    { name: 'customer_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_contracts_customer' },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_contracts_customer',
    },
  ])
  customer?: Customer;

  @Column({ name: 'signed_at', type: 'date' })
  signedAt!: Date;

  @Index('idx_contracts_expires_at')
  @Column({ name: 'expires_at', type: 'date' })
  expiresAt!: Date;

  @Index('idx_contracts_status')
  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;

  @ManyToOne(() => ContractStatusLookup)
  @JoinColumn({ name: 'status_id', foreignKeyConstraintName: 'fk_contracts_status' })
  statusLookup?: ContractStatusLookup;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  status!: ContractStatus;

  setTerm(signedAt: Date, expiresAt: Date): void {
    this.signedAt = signedAt;
    this.expiresAt = expiresAt;
  }

  setStatus(status: ContractStatus): void {
    this.status = status;
  }
}
