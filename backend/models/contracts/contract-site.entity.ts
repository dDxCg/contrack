import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { numericTransformer } from '../../utils/geo';
import { Tenant } from '../tenants/tenant.entity';
import { Contract } from './contract.entity';
@Entity('contract_sites')
@Unique('uq_contract_sites_id_tenant', ['id', 'tenantId'])
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
  @JoinColumn([
    {
      name: 'contract_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_contract_sites_contract',
    },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_contract_sites_contract',
    },
  ])
  contract?: Contract;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ name: 'work_requirements', type: 'varchar', length: 2000, nullable: true })
  workRequirements!: string | null;
  @Column({ type: 'varchar', length: 2000, nullable: true })
  notes!: string | null;
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true, transformer: numericTransformer })
  latitude!: number | null;
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true, transformer: numericTransformer })
  longitude!: number | null;
  @Column({ name: 'radius_meters', type: 'integer', default: 200 })
  radiusMeters!: number;
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
  setLocation(latitude: number | null, longitude: number | null, radiusMeters: number): void {
    this.latitude = latitude;
    this.longitude = longitude;
    this.radiusMeters = radiusMeters;
  }
}
