import { ContractStatus } from '../../models/contracts/contract.entity';
import { FrequencyUnit } from '../../models/contracts/contract-item.entity';
export interface ContractItemView {
  id: number;
  name: string;
  frequency_count: number;
  frequency_unit: FrequencyUnit;
  frequency_rule: string | null;
  unit_price: number;
}
export interface ContractSiteView {
  id: number;
  name: string;
  work_requirements: string | null;
  notes: string | null;
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
export interface ContractPage {
  items: ContractView[];
  total: number;
  limit: number;
  offset: number;
}
