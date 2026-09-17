import { Injectable } from '@nestjs/common';
import { AuthOutOfScopeException } from '../Models/domain-errors';
import { Customer, CustomerSegment } from '../Models/customer.entity';
import { CustomerRepository } from '../Repositories/customer.repository';
import { Page } from '../Repositories/tenant-scoped.repository';
import { AccessContext } from './AccessControl/access-context';

export interface CustomerView {
  id: number;
  name: string;
  company_name: string | null;
  contact: string | null;
  address: string | null;
  segment: CustomerSegment;
  created_at: string;
}

export interface CustomerPage {
  items: CustomerView[];
  total: number;
  limit: number;
  offset: number;
}

export interface CustomerCommand {
  name: string;
  companyName?: string | null;
  contact?: string | null;
  address?: string | null;
  segment?: CustomerSegment;
}

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async list(access: AccessContext, page: Page): Promise<CustomerPage> {
    const { items, total } = await this.customerRepository.list(access.tenantId, page);

    return { items: items.map(toCustomerView), total, limit: page.limit, offset: page.offset };
  }

  async get(access: AccessContext, id: number): Promise<CustomerView> {
    return toCustomerView(await this.requireCustomer(access, id));
  }

  async create(access: AccessContext, command: CustomerCommand): Promise<CustomerView> {
    const customer = new Customer();
    customer.tenantId = access.tenantId;
    customer.setName(command.name);
    customer.setCompanyName(command.companyName ?? null);
    customer.setContact(command.contact ?? null);
    customer.setAddress(command.address ?? null);
    customer.setSegment(command.segment ?? CustomerSegment.Regular);

    return toCustomerView(await this.customerRepository.create(customer));
  }

  async update(access: AccessContext, id: number, command: CustomerCommand): Promise<CustomerView> {
    const customer = await this.requireCustomer(access, id);
    customer.setName(command.name);
    customer.setCompanyName(command.companyName ?? null);
    customer.setContact(command.contact ?? null);
    customer.setAddress(command.address ?? null);
    if (command.segment !== undefined) {
      customer.setSegment(command.segment);
    }

    return toCustomerView(await this.customerRepository.update(customer));
  }

  async delete(access: AccessContext, id: number): Promise<void> {
    const customer = await this.requireCustomer(access, id);
    customer.delete(await this.customerRepository.activeContractIds(access.tenantId, id));

    await this.customerRepository.delete(access.tenantId, id);
  }

  private async requireCustomer(access: AccessContext, id: number): Promise<Customer> {
    const customer = await this.customerRepository.findById(access.tenantId, id);
    if (customer === null) {
      throw new AuthOutOfScopeException();
    }

    return customer;
  }
}

export function toCustomerView(customer: Customer): CustomerView {
  return {
    id: customer.id,
    name: customer.name,
    company_name: customer.companyName,
    contact: customer.contact,
    address: customer.address,
    segment: customer.segment,
    created_at: customer.createdAt.toISOString(),
  };
}
