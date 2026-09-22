import { ContractItem, FrequencyUnit } from '../entities/contract-item';
import { ContractItemNotFoundError, ValidationFailedError } from '../entities/errors';
import { ContractItemRepository, TenantId } from './ports';

export interface UpdateContractItemInput {
  tenantId: TenantId;
  itemId: number;
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: number;
}

export interface UpdateContractItemOutput {
  item: ContractItem;
}

export class UpdateContractItemUseCase {
  constructor(private readonly items: ContractItemRepository) {}

  async execute(input: UpdateContractItemInput): Promise<UpdateContractItemOutput> {
    const item = await this.items.findById(input.tenantId, input.itemId);
    if (item === null) {
      throw new ContractItemNotFoundError();
    }
    item.setName(input.name);
    item.setFrequency(
      input.frequencyCount,
      input.frequencyUnit,
      input.frequencyRule,
      input.dayOfWeek,
      input.dayOfMonth,
    );
    item.setUnitPrice(input.unitPrice);
    const violations = item.assertValid();
    if (violations.length > 0) {
      throw new ValidationFailedError(violations);
    }
    const saved = await this.items.update(item);
    return { item: saved };
  }
}
