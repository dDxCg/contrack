import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Contract } from './contract.entity';
@Entity('contract_sites')
export class ContractSite {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Index('idx_contract_sites_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_contract_sites_tenant' })
  tenant?: Tenant;
  @Index('idx_contract_sites_contract')
  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;
  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id', foreignKeyConstraintName: 'fk_contract_sites_contract' })
  contract?: Contract;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ name: 'work_requirements', type: 'varchar', length: 2000, nullable: true })
  workRequirements!: string | null;
  @Column({ type: 'varchar', length: 2000, nullable: true })
  notes!: string | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  setName(name: string): void {
    this.name = name;
  }
  setWorkRequirements(workRequirements: string | null): void {
    this.workRequirements = workRequirements;
  }
  setNotes(notes: string | null): void {
    this.notes = notes;
  }
}
