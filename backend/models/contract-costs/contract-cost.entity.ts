import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Money, moneyTransformer } from '../../utils/money';
import { Contract } from '../contracts/contract.entity';
import { Employee } from '../employees/employee.entity';
import { CostCategoryLookup } from '../lookups/cost-category.entity';
import { Tenant } from '../tenants/tenant.entity';

export enum CostCategory {
  Labor = 'labor',
  Materials = 'materials',
  Other = 'other',
}

@Entity('contract_costs')
@Unique('uq_contract_costs_period', ['contractId', 'categoryId', 'period'])
@Check('ck_contract_costs_period_is_month_start', `period = date_trunc('month', period)::date`)
export class ContractCost {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Index('idx_contract_costs_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_contract_costs_tenant' })
  tenant?: Tenant;

  @Index('idx_contract_costs_contract')
  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'contract_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_contract_costs_contract',
    },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_contract_costs_contract',
    },
  ])
  contract?: Contract;

  @Column({ name: 'category_id', type: 'integer' })
  categoryId!: number;

  @ManyToOne(() => CostCategoryLookup)
  @JoinColumn({ name: 'category_id', foreignKeyConstraintName: 'fk_contract_costs_category' })
  categoryLookup?: CostCategoryLookup;

  @Index('idx_contract_costs_period')
  @Column({ type: 'date' })
  period!: Date;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
  amount!: Money;

  @Column({ name: 'created_by', type: 'integer' })
  createdBy!: number;

  @ManyToOne(() => Employee)
  @JoinColumn([
    {
      name: 'created_by',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_contract_costs_created_by',
    },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_contract_costs_created_by',
    },
  ])
  createdByEmployee?: Employee;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  category!: CostCategory;
}
