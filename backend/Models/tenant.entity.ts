import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TenantSuspendedException } from './domain-errors';

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

  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  status!: TenantStatus;

  assertActive(): void {
    if (this.status !== TenantStatus.Active) {
      throw new TenantSuspendedException();
    }
  }
}
