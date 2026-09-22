import { ContractItemNotFoundError } from '../entities/errors';
import { ContractItemRepository, TenantId } from './ports';

export interface DeleteContractItemInput {
  tenantId: TenantId;
  itemId: number;
}

export class DeleteContractItemUseCase {
  constructor(private readonly items: ContractItemRepository) {}

  async execute(input: DeleteContractItemInput): Promise<void> {
    const item = await this.items.findById(input.tenantId, input.itemId);
    if (item === null) {
      throw new ContractItemNotFoundError();
    }
    await this.items.delete(input.tenantId, input.itemId);
  }
}
