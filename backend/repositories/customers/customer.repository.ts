import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Customer, CustomerSegment } from '../../models/customers/customer.entity';
import { Page, PageOf, TenantScopedRepository } from '../tenant-scoped.repository';
export interface ICustomerRepository {
  list(tenantId: number, page: Page): Promise<PageOf<Customer>>;
  findById(tenantId: number, id: number): Promise<Customer | null>;
  create(customer: Customer): Promise<Customer>;
  update(customer: Customer): Promise<Customer>;
  delete(tenantId: number, id: number): Promise<void>;
  activeContractIds(tenantId: number, customerId: number): Promise<number[]>;
}
@Injectable()
export class CustomerRepository extends TenantScopedRepository<Customer> implements ICustomerRepository {
  protected override readonly entity: EntityTarget<Customer> = Customer;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }
  async list(tenantId: number, page: Page): Promise<PageOf<Customer>> {
    const rows = await this.selected(tenantId)
      .orderBy('c.id', 'ASC')
      .limit(page.limit)
      .offset(page.offset)
      .getRawMany<CustomerRow>();
    const total = await this.scopedTo(tenantId, 'c').getCount();
    return { items: rows.map(hydrateCustomer), total };
  }
  async findById(tenantId: number, id: number): Promise<Customer | null> {
    const row = await this.selected(tenantId).andWhere('c.id = :id', { id }).getRawOne<CustomerRow>();
    return row === undefined || row === null ? null : hydrateCustomer(row);
  }
  async create(customer: Customer): Promise<Customer> {
    customer.segmentId = await this.lookupId('customer_segments', customer.segment);
    return this.saveAndReload(customer);
  }
  async update(customer: Customer): Promise<Customer> {
    customer.segmentId = await this.lookupId('customer_segments', customer.segment);
    return this.saveAndReload(customer);
  }
  async delete(tenantId: number, id: number): Promise<void> {
    await this.dataSource.getRepository(Customer).delete({ id, tenantId });
  }
  async activeContractIds(tenantId: number, customerId: number): Promise<number[]> {
    const rows = await this.scopedIds('contracts', tenantId, 'c')
      .innerJoin('contract_statuses', 's', 's.id = c.status_id')
      .andWhere('c.customer_id = :customerId', { customerId })
      .andWhere("s.code = 'active'")
      .getRawMany<{
        id: number;
      }>();
    return rows.map((row) => row.id);
  }
  private selected(tenantId: number): SelectQueryBuilder<Customer> {
    return this.scopedTo(tenantId, 'c')
      .innerJoin('customer_segments', 'g', 'g.id = c.segment_id')
      .select([
        'c.id AS id',
        'c.tenant_id AS tenant_id',
        'c.name AS name',
        'c.company_name AS company_name',
        'c.contact AS contact',
        'c.address AS address',
        'c.segment_id AS segment_id',
        'c.created_at AS created_at',
        'g.code AS segment',
      ]);
  }
  private async saveAndReload(customer: Customer): Promise<Customer> {
    const saved = await this.dataSource.getRepository(Customer).save(customer);
    const reloaded = await this.findById(saved.tenantId, saved.id);
    if (reloaded === null) {
      throw new Error(`customers row ${saved.id} disappeared right after it was written`);
    }
    return reloaded;
  }
}
interface CustomerRow {
  id: number;
  tenant_id: number;
  name: string;
  company_name: string | null;
  contact: string | null;
  address: string | null;
  segment_id: number;
  created_at: Date;
  segment: CustomerSegment;
}
function hydrateCustomer(row: CustomerRow): Customer {
  const customer = new Customer();
  customer.id = row.id;
  customer.tenantId = row.tenant_id;
  customer.name = row.name;
  customer.companyName = row.company_name;
  customer.contact = row.contact;
  customer.address = row.address;
  customer.segmentId = row.segment_id;
  customer.createdAt = row.created_at;
  customer.segment = row.segment;
  return customer;
}
