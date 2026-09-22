import { TenantId } from '../../../../shared-kernel/tenant-id';
import { Money } from '../../../../shared-kernel/money';
import { ContractItemNotFoundError, ContractNotFoundError } from '../../domain/errors';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { Frequency } from '../../domain/value-objects/frequency';
import { ContractItemView, UpdateContractItemInput } from '../dto/contract.dto';
import { toContractItemView } from '../dto/contract.mapper';

/** UpdateContractItem — ported from ContractService#updateItem. Rebuilds the Frequency value object from scratch so the same InvalidFrequencyError guard applies to edits as to creation. */
export class UpdateContractItemUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(input: UpdateContractItemInput): Promise<ContractItemView> {
    const tenantId = TenantId.of(input.tenantId);
    const contract = await this.contracts.findById(tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError(input.contractId);
    }
    const item = contract.findItem(input.itemId);
    if (item === undefined) {
      throw new ContractItemNotFoundError(input.itemId);
    }
    item.rename(input.item.name);
    item.changeFrequency(
      Frequency.create({
        count: input.item.frequencyCount,
        unit: input.item.frequencyUnit,
        rule: input.item.frequencyRule,
        dayOfWeek: input.item.dayOfWeek,
        dayOfMonth: input.item.dayOfMonth,
      }),
    );
    item.changeUnitPrice(Money.fromNumber(input.item.unitPrice));
    const saved = await this.contracts.update(contract);
    const savedItem = saved.findItem(input.itemId);
    /* istanbul ignore next -- defensive: the repository must round-trip the item it was just given */
    if (savedItem === undefined) {
      throw new ContractItemNotFoundError(input.itemId);
    }
    return toContractItemView(savedItem);
  }
}
