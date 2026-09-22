import { ContractItem, FrequencyUnit } from '../entities/contract-item';
import { ContractSite } from '../entities/contract-site';
import { Money } from '../entities/money';
import { ContractNotFoundError, ValidationFailedError } from '../entities/errors';
import { ContractItemRepository, ContractRepository, ContractSiteRepository, TenantId } from './ports';

export interface AddContractSiteItemInput {
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: number;
}

export interface AddContractSiteInput {
  tenantId: TenantId;
  contractId: number;
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  items: AddContractSiteItemInput[];
}

export interface AddContractSiteOutput {
  site: ContractSite;
}

// Faithful to backend/services/contracts/contract.service.ts#addSite: unlike
// contract creation, adding a site to an *existing* contract does not
// require items.length >= 1 — items are optional here, only their own
// per-item fields are validated when present.
export class AddContractSiteUseCase {
  constructor(
    private readonly contracts: ContractRepository,
    private readonly sites: ContractSiteRepository,
    private readonly items: ContractItemRepository,
  ) {}

  async execute(input: AddContractSiteInput): Promise<AddContractSiteOutput> {
    const contract = await this.contracts.findById(input.tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError();
    }
    const candidateItems = input.items.map((itemInput) =>
      ContractItem.create({
        tenantId: input.tenantId,
        name: itemInput.name,
        frequencyCount: itemInput.frequencyCount,
        frequencyUnit: itemInput.frequencyUnit,
        frequencyRule: itemInput.frequencyRule,
        dayOfWeek: itemInput.dayOfWeek,
        dayOfMonth: itemInput.dayOfMonth,
        unitPrice: Money.fromNumber(itemInput.unitPrice),
      }),
    );
    const violations = candidateItems.flatMap((item, index) =>
      item.assertValid().map((violation) => ({
        field: `items[${index}].${violation.field}`,
        message: violation.message,
      })),
    );
    if (violations.length > 0) {
      throw new ValidationFailedError(violations);
    }
    const site = new ContractSite({
      tenantId: input.tenantId,
      contractId: input.contractId,
      name: input.name,
      workRequirements: input.workRequirements,
      notes: input.notes,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
    });
    const savedSite = await this.sites.create(input.tenantId, input.contractId, site);
    for (const item of candidateItems) {
      const savedItem = await this.items.create(input.tenantId, savedSite.id as number, item);
      savedSite.addItem(savedItem);
    }
    return { site: savedSite };
  }
}
