import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AlertDeliveryStatusLookup } from '../lookups/alert-delivery-status.entity';
import { AlertKindLookup } from '../lookups/alert-kind.entity';
import { Tenant } from '../tenants/tenant.entity';

export enum AlertKind {
  ContractExpiring = 'contract_expiring',
  ShiftOverdue = 'shift_overdue',
  ScheduleOverload = 'schedule_overload',
}

export enum AlertDeliveryStatus {
  Sent = 'sent',
  NotSent = 'not_sent',
  Fallback = 'fallback',
}

@Entity('alerts')
@Unique('uq_alerts_kind_subject', ['tenantId', 'kindId', 'subjectId'])
export class Alert {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Index('idx_alerts_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_alerts_tenant' })
  tenant?: Tenant;

  @Column({ name: 'kind_id', type: 'integer' })
  kindId!: number;

  @ManyToOne(() => AlertKindLookup)
  @JoinColumn({ name: 'kind_id', foreignKeyConstraintName: 'fk_alerts_kind' })
  kindLookup?: AlertKindLookup;

  @Column({ name: 'subject_id', type: 'integer' })
  subjectId!: number;

  @Column({ name: 'delivery_status_id', type: 'integer' })
  deliveryStatusId!: number;

  @ManyToOne(() => AlertDeliveryStatusLookup)
  @JoinColumn({ name: 'delivery_status_id', foreignKeyConstraintName: 'fk_alerts_delivery_status' })
  deliveryStatusLookup?: AlertDeliveryStatusLookup;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  kind!: AlertKind;

  deliveryStatus!: AlertDeliveryStatus;

  setDeliveryStatus(status: AlertDeliveryStatus): void {
    this.deliveryStatus = status;
  }
}
