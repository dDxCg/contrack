import { FrequencyUnit } from '../../domain/value-objects/frequency-unit';
import { ContractStatus } from '../../domain/contract.aggregate';

/**
 * Application-layer DTOs — plain camelCase data shapes that use-cases take
 * as input and return as output. They depend only on domain/ vocabulary
 * types (FrequencyUnit, ContractStatus) and never on TypeORM or HTTP.
 * infrastructure/http has its OWN request/response DTOs (snake_case, with
 * class-validator decorators, mirroring the existing wire contract) and a
 * mapper that translates between the two — see
 * infrastructure/http/contracts.http-mapper.ts.
 */
export interface ContractItemInput {
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: number;
}

export interface ContractSiteInput {
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  items: ContractItemInput[];
}

export interface CreateContractInput {
  tenantId: number;
  customerId: number;
  signedAt: Date;
  expiresAt: Date;
  sites: ContractSiteInput[];
}

export interface UpdateContractInput {
  tenantId: number;
  contractId: number;
  expiresAt?: Date;
  status?: ContractStatus;
}

export interface AddContractSiteInput {
  tenantId: number;
  contractId: number;
  site: ContractSiteInput;
}

export interface AddContractItemInput {
  tenantId: number;
  contractId: number;
  siteId: number;
  item: ContractItemInput;
}

export interface UpdateContractItemInput {
  tenantId: number;
  contractId: number;
  itemId: number;
  item: ContractItemInput;
}

export interface ContractItemView {
  id: number;
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: number;
}

export interface ContractSiteView {
  id: number;
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  items: ContractItemView[];
}

export interface ContractView {
  id: number;
  customerId: number;
  signedAt: Date;
  expiresAt: Date;
  status: ContractStatus;
  sites: ContractSiteView[];
}

export interface Page {
  limit: number;
  offset: number;
}

export interface ContractPage {
  items: ContractView[];
  total: number;
  limit: number;
  offset: number;
}
