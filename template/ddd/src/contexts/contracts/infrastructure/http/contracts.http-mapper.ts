import {
  ContractItemInput,
  ContractItemView,
  ContractPage,
  ContractSiteInput,
  ContractSiteView,
  ContractView,
} from '../../application/dto/contract.dto';
import { ScheduledItemDates } from '../../application/use-cases/generate-schedule.use-case';
import {
  ContractBodyDto,
  ContractItemBodyDto,
  ContractSiteAddBodyDto,
  ContractSiteBodyDto,
} from './dto/contract-request.dto';
import {
  ContractItemResponse,
  ContractPageResponse,
  ContractResponse,
  ContractSiteResponse,
  ScheduledItemDatesResponse,
} from './dto/contract-response.dto';

const DEFAULT_GEOFENCE_RADIUS_METERS = 200;

/** Converts snake_case wire DTOs into camelCase application-layer input, and application views back into snake_case wire responses. All HTTP<->application translation lives in this one file. */
export function toItemInput(body: ContractItemBodyDto): ContractItemInput {
  return {
    name: body.name,
    frequencyCount: body.frequency_count,
    frequencyUnit: body.frequency_unit,
    frequencyRule: body.frequency_rule ?? null,
    dayOfWeek: body.day_of_week ?? null,
    dayOfMonth: body.day_of_month ?? null,
    unitPrice: body.unit_price,
  };
}

export function toSiteInput(body: ContractSiteBodyDto | ContractSiteAddBodyDto): ContractSiteInput {
  return {
    name: body.name,
    workRequirements: body.work_requirements ?? null,
    notes: body.notes ?? null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    radiusMeters: body.radius_meters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
    items: (body.items ?? []).map(toItemInput),
  };
}

export function toCreateContractSites(body: ContractBodyDto): ContractSiteInput[] {
  return body.sites.map(toSiteInput);
}

export function toItemResponse(item: ContractItemView): ContractItemResponse {
  return {
    id: item.id,
    name: item.name,
    frequency_count: item.frequencyCount,
    frequency_unit: item.frequencyUnit,
    frequency_rule: item.frequencyRule,
    day_of_week: item.dayOfWeek,
    day_of_month: item.dayOfMonth,
    unit_price: item.unitPrice,
  };
}

export function toSiteResponse(site: ContractSiteView): ContractSiteResponse {
  return {
    id: site.id,
    name: site.name,
    work_requirements: site.workRequirements,
    notes: site.notes,
    latitude: site.latitude,
    longitude: site.longitude,
    radius_meters: site.radiusMeters,
    items: site.items.map(toItemResponse),
  };
}

export function toContractResponse(contract: ContractView): ContractResponse {
  return {
    id: contract.id,
    customer_id: contract.customerId,
    signed_at: toDateString(contract.signedAt),
    expires_at: toDateString(contract.expiresAt),
    status: contract.status,
    sites: contract.sites.map(toSiteResponse),
  };
}

export function toContractPageResponse(page: ContractPage): ContractPageResponse {
  return {
    items: page.items.map(toContractResponse),
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  };
}

export function toScheduleResponse(entries: ScheduledItemDates[]): ScheduledItemDatesResponse[] {
  return entries.map((entry) => ({
    site_id: entry.siteId,
    item_id: entry.itemId,
    dates: entry.dates.map(toDateString),
  }));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
