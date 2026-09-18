import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CustomerHasActiveContractsException } from '../domain-errors';
import { CustomerSegmentLookup } from '../lookups/customer-segment.entity';
import { Tenant } from '../tenants/tenant.entity';
export enum CustomerSegment {
  Regular = 'regular',
  Vip = 'vip',
}
@Entity('customers')
@Unique('uq_customers_id_tenant', ['id', 'tenantId'])
export class Customer {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Index('idx_customers_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_customers_tenant' })
  tenant?: Tenant;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true })
  contact!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;
  @Index('idx_customers_segment')
  @Column({ name: 'segment_id', type: 'integer', default: 1 })
  segmentId!: number;
  @ManyToOne(() => CustomerSegmentLookup)
  @JoinColumn({ name: 'segment_id', foreignKeyConstraintName: 'fk_customers_segment' })
  segmentLookup?: CustomerSegmentLookup;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  segment!: CustomerSegment;
  delete(activeContractIds: readonly number[]): void {
    if (activeContractIds.length > 0) {
      throw new CustomerHasActiveContractsException(activeContractIds);
    }
  }
  setName(name: string): void {
    this.name = name;
  }
  setCompanyName(companyName: string | null): void {
    this.companyName = companyName;
  }
  setContact(contact: string | null): void {
    this.contact = contact;
  }
  setAddress(address: string | null): void {
    this.address = address;
  }
  setSegment(segment: CustomerSegment): void {
    this.segment = segment;
  }
}
