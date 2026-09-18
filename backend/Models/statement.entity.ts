import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StatementImmutableException, StatementNotIssuedException } from './domain-errors';

export enum StatementStatus {
  Draft = 'draft',
  Issued = 'issued',
  Sent = 'sent',
}

@Entity('statements')
export class Statement {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;

  @Column({ type: 'date' })
  period!: Date;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  status!: StatementStatus;

  /** Renders the PDF (FR11) and freezes the statement — never mutated again after this. */
  export(): void {
    if (this.status !== StatementStatus.Draft) {
      throw new StatementImmutableException(this.status);
    }

    this.status = StatementStatus.Issued;
  }

  /** Idempotent per US-16 — a second send is rejected, not silently repeated. */
  send(): void {
    if (this.status !== StatementStatus.Issued) {
      throw new StatementNotIssuedException(this.status);
    }

    this.status = StatementStatus.Sent;
  }
}
