import { ContractStatus } from '../../entities/contract';
import { FrequencyUnit } from '../../entities/contract-item';
import { AddContractSiteUseCase } from '../../use-cases/add-contract-site.use-case';
import { CreateContractUseCase } from '../../use-cases/create-contract.use-case';
import { DeleteContractUseCase } from '../../use-cases/delete-contract.use-case';
import { GetContractDetailUseCase } from '../../use-cases/get-contract-detail.use-case';
import { ListContractsUseCase } from '../../use-cases/list-contracts.use-case';
import { TenantId } from '../../use-cases/ports';
import { UpdateContractUseCase } from '../../use-cases/update-contract.use-case';
import { ContractPageResponse, ContractPresenter, ContractResponse, ContractSiteResponse } from '../presenters/contract.presenter';

// Interface-adapters controller: translates an already-parsed, already
// tenant-resolved request into a use case's input boundary, invokes it, and
// hands the output boundary to a presenter. It has no knowledge of Express,
// Nest decorators or HTTP verbs — frameworks-drivers/web/*.controller.ts is
// the thin NestJS layer that calls into this class.
export interface ContractItemRequest {
  name: string;
  frequency_count: number;
  frequency_unit: FrequencyUnit;
  frequency_rule?: string | null;
  day_of_week?: number | null;
  day_of_month?: number | null;
  unit_price: number;
}

export interface ContractSiteRequest {
  name: string;
  work_requirements?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number;
  items: ContractItemRequest[];
}

export interface ContractSiteAddRequest extends Omit<ContractSiteRequest, 'items'> {
  items?: ContractItemRequest[];
}

export interface ContractCreateRequest {
  customer_id: number;
  signed_at: string;
  expires_at: string;
  sites: ContractSiteRequest[];
}

export interface ContractUpdateRequest {
  expires_at?: string;
  status?: ContractStatus;
}

const DEFAULT_GEOFENCE_RADIUS_METERS = 200;

function toItemInput(item: ContractItemRequest) {
  return {
    name: item.name,
    frequencyCount: item.frequency_count,
    frequencyUnit: item.frequency_unit,
    frequencyRule: item.frequency_rule ?? null,
    dayOfWeek: item.day_of_week ?? null,
    dayOfMonth: item.day_of_month ?? null,
    unitPrice: item.unit_price,
  };
}

export function toSiteInput(site: ContractSiteAddRequest) {
  return {
    name: site.name,
    workRequirements: site.work_requirements ?? null,
    notes: site.notes ?? null,
    latitude: site.latitude ?? null,
    longitude: site.longitude ?? null,
    radiusMeters: site.radius_meters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
    items: (site.items ?? []).map(toItemInput),
  };
}

export class ContractsController {
  constructor(
    private readonly createContract: CreateContractUseCase,
    private readonly listContracts: ListContractsUseCase,
    private readonly getContractDetail: GetContractDetailUseCase,
    private readonly updateContract: UpdateContractUseCase,
    private readonly deleteContract: DeleteContractUseCase,
    private readonly addContractSite: AddContractSiteUseCase,
  ) {}

  async list(tenantId: TenantId, query: { limit: number; offset: number }): Promise<ContractPageResponse> {
    const { items, total, limit, offset } = await this.listContracts.execute({
      tenantId,
      page: { limit: query.limit, offset: query.offset },
    });
    return ContractPresenter.page(items, total, limit, offset);
  }

  async create(tenantId: TenantId, body: ContractCreateRequest): Promise<ContractResponse> {
    const { contract } = await this.createContract.execute({
      tenantId,
      customerId: body.customer_id,
      signedAt: new Date(body.signed_at),
      expiresAt: new Date(body.expires_at),
      sites: body.sites.map(toSiteInput),
    });
    return ContractPresenter.contract(contract);
  }

  async get(tenantId: TenantId, id: number): Promise<ContractResponse> {
    const { contract } = await this.getContractDetail.execute({ tenantId, contractId: id });
    return ContractPresenter.contract(contract);
  }

  async update(tenantId: TenantId, id: number, body: ContractUpdateRequest): Promise<ContractResponse> {
    const { contract } = await this.updateContract.execute({
      tenantId,
      contractId: id,
      expiresAt: body.expires_at === undefined ? undefined : new Date(body.expires_at),
      status: body.status,
    });
    return ContractPresenter.contract(contract);
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    await this.deleteContract.execute({ tenantId, contractId: id });
  }

  async addSite(tenantId: TenantId, id: number, body: ContractSiteAddRequest): Promise<ContractSiteResponse> {
    const input = toSiteInput(body);
    const { site } = await this.addContractSite.execute({ tenantId, contractId: id, ...input });
    return ContractPresenter.site(site);
  }
}
