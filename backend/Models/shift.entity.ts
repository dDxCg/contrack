import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ShiftStatus {
  Scheduled = 'scheduled',
  Late = 'late',
  Completed = 'completed',
  Disputed = 'disputed',
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Column({ name: 'contract_item_id', type: 'integer' })
  contractItemId!: number;

  @Column({ name: 'assignee_id', type: 'integer', nullable: true })
  assigneeId!: number | null;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate!: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude!: number | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude!: number | null;

  @Column({ name: 'captured_at', type: 'timestamp', nullable: true })
  capturedAt!: Date | null;

  @Column({ name: 'receipt_photo_url', type: 'varchar', length: 500, nullable: true })
  receiptPhotoUrl!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  status!: ShiftStatus;
}
