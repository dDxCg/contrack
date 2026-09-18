import { CustomerSegment } from '../../models/customers/customer.entity';

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
