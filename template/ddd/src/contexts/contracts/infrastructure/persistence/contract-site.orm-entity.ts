import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractOrmEntity } from './contract.orm-entity';
import { ContractItemOrmEntity } from './contract-item.orm-entity';

/** ContractSiteOrmEntity — infrastructure/persistence model for ContractSite. See contract.orm-entity.ts for the domain/persistence split rationale. */
@Entity('contract_sites')
export class ContractSiteOrmEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @Index()
  @Column({ name: 'contract_id', type: 'integer' })
  contractId!: number;

  @ManyToOne(() => ContractOrmEntity, (contract) => contract.sites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractOrmEntity;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => ContractItemOrmEntity, (item) => item.site, { cascade: true })
  items!: ContractItemOrmEntity[];
}
