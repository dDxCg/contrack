import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TenantSuspendedException } from '../domain-errors';
import { TenantStatusLookup } from '../lookups/tenant-status.entity';

export enum TenantStatus {
  Active = 'active',
  Suspended = 'suspended',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index('idx_tenants_status')
  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;

  @ManyToOne(() => TenantStatusLookup)
  @JoinColumn({ name: 'status_id', foreignKeyConstraintName: 'fk_tenants_status' })
  statusLookup?: TenantStatusLookup;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Ho_Chi_Minh' })
  timezone!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  status!: TenantStatus;

  assertActive(): void {
    if (this.status !== TenantStatus.Active) {
      throw new TenantSuspendedException();
    }
  }
}
