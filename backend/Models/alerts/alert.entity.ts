import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum AlertKind {
  ContractExpiring = 'contract_expiring',
  ShiftOverdue = 'shift_overdue',
}
export enum AlertDeliveryStatus {
  Sent = 'sent',
  NotSent = 'not_sent',
  Fallback = 'fallback',
}
@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @Column({ name: 'kind_id', type: 'integer' })
  kindId!: number;
  @Column({ name: 'subject_id', type: 'integer' })
  subjectId!: number;
  @Column({ name: 'delivery_status_id', type: 'integer' })
  deliveryStatusId!: number;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  kind!: AlertKind;
  deliveryStatus!: AlertDeliveryStatus;
  setDeliveryStatus(status: AlertDeliveryStatus): void {
    this.deliveryStatus = status;
  }
}
