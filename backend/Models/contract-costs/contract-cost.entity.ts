import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum CostCategory {
  Labor = 'labor',
  Materials = 'materials',
  Other = 'other',
}
@Entity('contract_costs')
export class ContractCost {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;
  @Column({ name: 'category_id', type: 'integer' })
  categoryId!: number;
  @Column({ type: 'date' })
  period!: Date;
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;
  @Column({ name: 'created_by', type: 'integer' })
  createdBy!: number;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  category!: CostCategory;
}
