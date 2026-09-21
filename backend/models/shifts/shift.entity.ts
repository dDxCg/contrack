import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import {
  ShiftAlreadyCompletedException,
  ShiftAlreadyDisputedException,
  ShiftNotDisputedException,
} from '../domain-errors';
import { ContractItem } from '../contracts/contract-item.entity';
import { Employee } from '../employees/employee.entity';
import { ShiftStatusLookup } from '../lookups/shift-status.entity';
import { Team } from '../teams/team.entity';
import { Tenant } from '../tenants/tenant.entity';
export interface ShiftEvidence {
  receiptPhotoUrl: string;
  latitude: number | null;
  longitude: number | null;
  geoVerified: boolean;
}
export interface DisputeDetails {
  reason: string;
  reportedVia: 'phone' | 'in_person' | null;
  reportedBy: string | null;
  reportedAt: Date | null;
  description: string | null;
}
export enum ShiftStatus {
  Scheduled = 'scheduled',
  Late = 'late',
  Completed = 'completed',
  Disputed = 'disputed',
}
@Entity('shifts')
@Unique('uq_shifts_id_tenant', ['id', 'tenantId'])
export class Shift {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Index('idx_shifts_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_shifts_tenant' })
  tenant?: Tenant;
  @Index('idx_shifts_contract_item')
  @Column({ name: 'contract_item_id', type: 'integer' })
  contractItemId!: number;
  @ManyToOne(() => ContractItem, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'contract_item_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_shifts_contract_item',
    },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_shifts_contract_item',
    },
  ])
  contractItem?: ContractItem;
  @Index('idx_shifts_assignee')
  @Column({ name: 'assignee_id', type: 'integer', nullable: true })
  assigneeId!: number | null;
  @ManyToOne(() => Employee)
  @JoinColumn([
    { name: 'assignee_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_shifts_assignee' },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_shifts_assignee',
    },
  ])
  assignee?: Employee;
  @Index('idx_shifts_team')
  @Column({ name: 'team_id', type: 'integer', nullable: true })
  teamId!: number | null;
  @ManyToOne(() => Team)
  @JoinColumn([
    { name: 'team_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_shifts_team' },
    { name: 'tenant_id', referencedColumnName: 'tenantId', foreignKeyConstraintName: 'fk_shifts_team' },
  ])
  team?: Team;
  @Index('idx_shifts_scheduled_date')
  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate!: Date;
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;
  @Index('idx_shifts_status')
  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;
  @ManyToOne(() => ShiftStatusLookup)
  @JoinColumn({ name: 'status_id', foreignKeyConstraintName: 'fk_shifts_status' })
  statusLookup?: ShiftStatusLookup;
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude!: number | null;
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude!: number | null;
  @Column({ name: 'captured_at', type: 'timestamp', nullable: true })
  capturedAt!: Date | null;
  @Column({ name: 'receipt_photo_url', type: 'varchar', length: 500, nullable: true })
  receiptPhotoUrl!: string | null;
  @Column({ name: 'geo_verified', type: 'boolean', default: false })
  geoVerified!: boolean;
  @Column({ name: 'field_token_used_at', type: 'timestamp', nullable: true })
  fieldTokenUsedAt!: Date | null;
  @Column({ name: 'dispute_reason', type: 'varchar', length: 500, nullable: true })
  disputeReason!: string | null;
  @Column({ name: 'dispute_reported_via', type: 'varchar', length: 20, nullable: true })
  disputeReportedVia!: 'phone' | 'in_person' | null;
  @Column({ name: 'dispute_reported_by', type: 'varchar', length: 255, nullable: true })
  disputeReportedBy!: string | null;
  @Column({ name: 'dispute_reported_at', type: 'timestamp', nullable: true })
  disputeReportedAt!: Date | null;
  @Column({ name: 'dispute_description', type: 'text', nullable: true })
  disputeDescription!: string | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  status!: ShiftStatus;
  complete(evidence: ShiftEvidence, now: Date): void {
    if (this.status === ShiftStatus.Completed || this.status === ShiftStatus.Disputed) {
      throw new ShiftAlreadyCompletedException(this.completedAt);
    }
    this.completedAt = now;
    this.capturedAt = now;
    this.receiptPhotoUrl = evidence.receiptPhotoUrl;
    this.latitude = evidence.latitude;
    this.longitude = evidence.longitude;
    this.geoVerified = evidence.geoVerified;
    this.status = ShiftStatus.Completed;
  }
  dispute(details: DisputeDetails): void {
    if (this.status === ShiftStatus.Disputed) {
      throw new ShiftAlreadyDisputedException();
    }
    this.disputeReason = details.reason;
    this.disputeReportedVia = details.reportedVia;
    this.disputeReportedBy = details.reportedBy;
    this.disputeReportedAt = details.reportedAt;
    this.disputeDescription = details.description;
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
  assignTeam(teamId: number | null): void {
    if (this.status === ShiftStatus.Completed) {
      throw new ShiftAlreadyCompletedException(this.completedAt);
    }
    this.teamId = teamId;
  }
}
