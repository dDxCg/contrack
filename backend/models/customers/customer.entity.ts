import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CustomerHasActiveContractsException } from '../domain-errors';
export enum CustomerSegment {
  Regular = 'regular',
  Vip = 'vip',
}
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true })
  contact!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;
  @Column({ name: 'segment_id', type: 'integer', default: 1 })
  segmentId!: number;
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
