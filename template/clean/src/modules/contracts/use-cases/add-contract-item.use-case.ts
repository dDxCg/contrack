import { ContractItem, FrequencyUnit } from '../entities/contract-item';
import { Money } from '../entities/money';
import { ContractSiteNotFoundError, ValidationFailedError } from '../entities/errors';
import { ContractItemRepository, ContractSiteRepository, TenantId } from './ports';

export interface AddContractItemInput {
  tenantId: TenantId;
  siteId: number;
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: number;
}

export interface AddContractItemOutput {
  item: ContractItem;
}

export class AddContractItemUseCase {
  constructor(
    private readonly sites: ContractSiteRepository,
    private readonly items: ContractItemRepository,
  ) {}

  async execute(input: AddContractItemInput): Promise<AddContractItemOutput> {
    const site = await this.sites.findById(input.tenantId, input.siteId);
    if (site === null) {
      throw new ContractSiteNotFoundError();
    }
    const item = ContractItem.create({
      tenantId: input.tenantId,
      siteId: site.id,
      name: input.name,
      frequencyCount: input.frequencyCount,
      frequencyUnit: input.frequencyUnit,
      frequencyRule: input.frequencyRule,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      unitPrice: Money.fromNumber(input.unitPrice),
    });
    const violations = item.assertValid();
    if (violations.length > 0) {
      throw new ValidationFailedError(violations);
    }
    const saved = await this.items.create(input.tenantId, input.siteId, item);
    return { item: saved };
  }
}
