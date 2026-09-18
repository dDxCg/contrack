import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('contract_sites')
export class ContractSite {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;
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
