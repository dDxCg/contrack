import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum ContractStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Renewed = 'renewed',
}
@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @Column({ name: 'customer_id', type: 'integer' })
  customerId!: number;
  @Column({ name: 'signed_at', type: 'date' })
  signedAt!: Date;
  @Column({ name: 'expires_at', type: 'date' })
  expiresAt!: Date;
  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;
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
