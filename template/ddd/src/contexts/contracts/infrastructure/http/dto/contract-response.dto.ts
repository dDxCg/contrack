import { ContractStatus } from '../../../domain/contract.aggregate';
import { FrequencyUnit } from '../../../domain/value-objects/frequency-unit';

/** HTTP response shapes — snake_case, mirroring backend/dtos/contracts/contracts.response.dto.ts. */
export interface ContractItemResponse {
  id: number;
  name: string;
  frequency_count: number;
  frequency_unit: FrequencyUnit;
  frequency_rule: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  unit_price: number;
}

export interface ContractSiteResponse {
  id: number;
  name: string;
  work_requirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  items: ContractItemResponse[];
}

export interface ContractResponse {
  id: number;
  customer_id: number;
  signed_at: string;
  expires_at: string;
  status: ContractStatus;
  sites: ContractSiteResponse[];
}

export interface ContractPageResponse {
  items: ContractResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface ScheduledItemDatesResponse {
  site_id: number;
  item_id: number;
  dates: string[];
}
