import { ContractStatus } from '../../models/contracts/contract.entity';
import { FrequencyUnit } from '../../models/contracts/contract-item.entity';
import { PageView } from '../page.dto';
export interface ContractItemView {
  id: number;
  name: string;
  frequency_count: number;
  frequency_unit: FrequencyUnit;
  frequency_rule: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  unit_price: number;
}
export interface ContractSiteView {
  id: number;
  name: string;
  work_requirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  items: ContractItemView[];
}
export interface ContractView {
  id: number;
  customer_id: number;
  signed_at: string;
  expires_at: string;
  status: ContractStatus;
  sites: ContractSiteView[];
}
export type ContractPage = PageView<ContractView>;
