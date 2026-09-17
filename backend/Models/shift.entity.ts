import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  ShiftAlreadyCompletedException,
  ShiftAlreadyDisputedException,
  ShiftNotDisputedException,
} from './domain-errors';

export interface ShiftEvidence {
  receiptPhotoUrl: string;
  latitude: number | null;
  longitude: number | null;
}

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

  /** Write-once evidence (D7): a completed or disputed shift rejects a second submission. */
  complete(evidence: ShiftEvidence, now: Date): void {
    if (this.status === ShiftStatus.Completed || this.status === ShiftStatus.Disputed) {
      throw new ShiftAlreadyCompletedException(this.completedAt);
    }

    this.completedAt = now;
    this.capturedAt = now;
    this.receiptPhotoUrl = evidence.receiptPhotoUrl;
    this.latitude = evidence.latitude;
    this.longitude = evidence.longitude;
    this.status = ShiftStatus.Completed;
  }

  dispute(): void {
    if (this.status === ShiftStatus.Disputed) {
      throw new ShiftAlreadyDisputedException();
    }

    this.status = ShiftStatus.Disputed;
  }

  resolveDispute(): void {
    if (this.status !== ShiftStatus.Disputed) {
      throw new ShiftNotDisputedException(this.status);
    }

    this.status = ShiftStatus.Completed;
  }

  reassign(assigneeId: number | null, scheduledDate?: Date): void {
    if (this.status === ShiftStatus.Completed) {
      throw new ShiftAlreadyCompletedException(this.completedAt);
    }

    this.assigneeId = assigneeId;
    if (scheduledDate !== undefined) {
      this.scheduledDate = scheduledDate;
    }
  }
}
