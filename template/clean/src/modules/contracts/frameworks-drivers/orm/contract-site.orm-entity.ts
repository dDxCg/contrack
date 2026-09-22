import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('contract_sites')
export class ContractSiteOrmEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('idx_contract_sites_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Index('idx_contract_sites_contract')
  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'work_requirements', type: 'varchar', length: 2000, nullable: true })
  workRequirements!: string | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  notes!: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude!: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude!: string | null;

  @Column({ name: 'radius_meters', type: 'integer', default: 200 })
  radiusMeters!: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
