import { DeleteContractItemUseCase } from '../../use-cases/delete-contract-item.use-case';
import { TenantId } from '../../use-cases/ports';
import { UpdateContractItemUseCase } from '../../use-cases/update-contract-item.use-case';
import { ContractPresenter, ContractItemResponse } from '../presenters/contract.presenter';
import { ContractItemRequest } from './contracts.controller';

export class ItemsController {
  constructor(
    private readonly updateContractItem: UpdateContractItemUseCase,
    private readonly deleteContractItem: DeleteContractItemUseCase,
  ) {}

  async update(tenantId: TenantId, id: number, body: ContractItemRequest): Promise<ContractItemResponse> {
    const { item } = await this.updateContractItem.execute({
      tenantId,
      itemId: id,
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

  async delete(tenantId: TenantId, id: number): Promise<void> {
    await this.deleteContractItem.execute({ tenantId, itemId: id });
  }
}
