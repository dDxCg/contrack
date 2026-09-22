import { Contract } from '../../entities/contract';
import { ContractItem } from '../../entities/contract-item';
import { ContractSite } from '../../entities/contract-site';

// Presenters translate a use case's output boundary (plain entities) into
// the HTTP response shape. This mirrors backend/dtos/contracts/
// contracts.mapper.ts and contracts.response.dto.ts field-for-field (same
// snake_case wire shape), so a client migrating from the monolithic backend
// to this port sees no difference on the wire.
export interface ContractItemResponse {
  id: number;
  name: string;
  frequency_count: number;
  frequency_unit: string;
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
  status: string;
  sites: ContractSiteResponse[];
}

export interface ContractPageResponse {
  items: ContractResponse[];
  total: number;
  limit: number;
  offset: number;
}

export class ContractPresenter {
  static item(item: ContractItem): ContractItemResponse {
    return {
      id: item.id as number,
      name: item.name,
      frequency_count: item.frequencyCount,
      frequency_unit: item.frequencyUnit,
      frequency_rule: item.frequencyRule,
      day_of_week: item.dayOfWeek,
      day_of_month: item.dayOfMonth,
      unit_price: item.unitPrice.toNumber(),
    };
  }

  static site(site: ContractSite): ContractSiteResponse {
    return {
      id: site.id as number,
      name: site.name,
      work_requirements: site.workRequirements,
      notes: site.notes,
      latitude: site.latitude,
      longitude: site.longitude,
      radius_meters: site.radiusMeters,
      items: site.items.map((item) => ContractPresenter.item(item)),
    };
  }

  static contract(contract: Contract): ContractResponse {
    return {
      id: contract.id as number,
      customer_id: contract.customerId,
      signed_at: contract.signedAt.toISOString().slice(0, 10),
      expires_at: contract.expiresAt.toISOString().slice(0, 10),
      status: contract.status,
      sites: contract.sites.map((site) => ContractPresenter.site(site)),
    };
  }

  static page(contracts: Contract[], total: number, limit: number, offset: number): ContractPageResponse {
    return { items: contracts.map((c) => ContractPresenter.contract(c)), total, limit, offset };
  }
}
