import { CustomerSegment } from '../../models/customers/customer.entity';
import { PageView } from '../page.dto';

export interface CustomerView {
  id: number;
  name: string;
  company_name: string | null;
  contact: string | null;
  address: string | null;
  segment: CustomerSegment;
  created_at: string;
}

export type CustomerPage = PageView<CustomerView>;
