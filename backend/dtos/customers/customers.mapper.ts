import { Customer } from '../../models/customers/customer.entity';
import { CustomerView } from './customers.response.dto';
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
