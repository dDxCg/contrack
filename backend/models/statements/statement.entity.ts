import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { StatementImmutableException, StatementNotIssuedException } from '../domain-errors';
import { Money, moneyTransformer } from '../../utils/money';
import { Contract } from '../contracts/contract.entity';
import { StatementStatusLookup } from '../lookups/statement-status.entity';
import { Tenant } from '../tenants/tenant.entity';
export enum StatementStatus {
  Draft = 'draft',
  Issued = 'issued',
  Sent = 'sent',
}
@Entity('statements')
@Unique('uq_statements_contract_period', ['contractId', 'period'])
@Check('ck_statements_period_is_month_start', `period = date_trunc('month', period)::date`)
export class Statement {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Index('idx_statements_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_statements_tenant' })
  tenant?: Tenant;
  @Index('idx_statements_contract')
  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;
  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'contract_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_statements_contract',
    },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_statements_contract',
    },
  ])
  contract?: Contract;
  @Column({ type: 'date' })
  period!: Date;
  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  totalAmount!: Money;
  @Index('idx_statements_status')
  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;
  @ManyToOne(() => StatementStatusLookup)
  @JoinColumn({ name: 'status_id', foreignKeyConstraintName: 'fk_statements_status' })
  statusLookup?: StatementStatusLookup;
  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl!: string | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  status!: StatementStatus;
  export(): void {
    if (this.status !== StatementStatus.Draft) {
      throw new StatementImmutableException(this.status);
    }
    this.status = StatementStatus.Issued;
  }
  send(): void {
    if (this.status !== StatementStatus.Issued) {
      throw new StatementNotIssuedException(this.status);
    }
    this.status = StatementStatus.Sent;
  }
}
