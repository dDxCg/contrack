import { AddContractItemUseCase } from '../../use-cases/add-contract-item.use-case';
import { DeleteContractSiteUseCase } from '../../use-cases/delete-contract-site.use-case';
import { TenantId } from '../../use-cases/ports';
import { UpdateContractSiteUseCase } from '../../use-cases/update-contract-site.use-case';
import { ContractPresenter, ContractItemResponse, ContractSiteResponse } from '../presenters/contract.presenter';
import { ContractItemRequest, ContractSiteRequest } from './contracts.controller';

const DEFAULT_GEOFENCE_RADIUS_METERS = 200;

export type ContractSiteUpdateRequest = Omit<ContractSiteRequest, 'items'>;

export class SitesController {
  constructor(
    private readonly updateContractSite: UpdateContractSiteUseCase,
    private readonly deleteContractSite: DeleteContractSiteUseCase,
    private readonly addContractItem: AddContractItemUseCase,
  ) {}

  async update(tenantId: TenantId, id: number, body: ContractSiteUpdateRequest): Promise<ContractSiteResponse> {
    const { site } = await this.updateContractSite.execute({
      tenantId,
      siteId: id,
      name: body.name,
      workRequirements: body.work_requirements ?? null,
      notes: body.notes ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      radiusMeters: body.radius_meters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
    });
    return ContractPresenter.site(site);
  }

  async delete(tenantId: TenantId, id: number): Promise<void> {
    await this.deleteContractSite.execute({ tenantId, siteId: id });
  }

  async addItem(tenantId: TenantId, id: number, body: ContractItemRequest): Promise<ContractItemResponse> {
    const { item } = await this.addContractItem.execute({
      tenantId,
      siteId: id,
      name: body.name,
      frequencyCount: body.frequency_count,
      frequencyUnit: body.frequency_unit,
      frequencyRule: body.frequency_rule ?? null,
      dayOfWeek: body.day_of_week ?? null,
      dayOfMonth: body.day_of_month ?? null,
      unitPrice: body.unit_price,
    });
    return ContractPresenter.item(item);
  }
}
