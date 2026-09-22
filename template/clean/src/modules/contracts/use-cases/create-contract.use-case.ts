import { Contract, ContractStatus } from '../entities/contract';
import { ContractItem, FrequencyUnit } from '../entities/contract-item';
import { ContractSite } from '../entities/contract-site';
import { Money } from '../entities/money';
import { ValidationFailedError } from '../entities/errors';
import { ContractItemRepository, ContractRepository, ContractSiteRepository, TenantId } from './ports';

// Application business rule input/output boundary types. These are the
// use case's public contract — the interface-adapters controller builds
// this shape from an HTTP request, and the presenter reads the output
// shape to build an HTTP response. Neither side needs to know about the
// other.
export interface CreateContractItemInput {
  name: string;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  frequencyRule: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  unitPrice: number;
}

export interface CreateContractSiteInput {
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  items: CreateContractItemInput[];
}

export interface CreateContractInput {
  tenantId: TenantId;
  customerId: number;
  signedAt: Date;
  expiresAt: Date;
  sites: CreateContractSiteInput[];
}

export interface CreateContractOutput {
  contract: Contract;
}

// Depends on all three gateways, same as backend/services/contracts/
// contract.service.ts#persist(): the contract row, its sites and their items
// are three separate tables/aggregates below the Contract entity, so the use
// case — not any single repository — orchestrates saving all three within
// one logical unit of work.
export class CreateContractUseCase {
  constructor(
    private readonly contracts: ContractRepository,
    private readonly sites: ContractSiteRepository,
    private readonly items: ContractItemRepository,
  ) {}

  async execute(input: CreateContractInput): Promise<CreateContractOutput> {
    const contract = new Contract({
      tenantId: input.tenantId,
      customerId: input.customerId,
      signedAt: input.signedAt,
      expiresAt: input.expiresAt,
      status: ContractStatus.Active,
    });
    for (const siteInput of input.sites) {
      const site = new ContractSite({
        tenantId: input.tenantId,
        name: siteInput.name,
        workRequirements: siteInput.workRequirements,
        notes: siteInput.notes,
        latitude: siteInput.latitude,
        longitude: siteInput.longitude,
        radiusMeters: siteInput.radiusMeters,
      });
      for (const itemInput of siteInput.items) {
        site.addItem(
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
      }
      contract.addSite(site);
    }
    const violations = contract.validateForCreation();
    if (violations.length > 0) {
      throw new ValidationFailedError(violations);
    }
    const savedContract = await this.contracts.create(input.tenantId, contract);
    for (const site of contract.sites) {
      const savedSite = await this.sites.create(input.tenantId, savedContract.id as number, site);
      for (const item of site.items) {
        const savedItem = await this.items.create(input.tenantId, savedSite.id as number, item);
        savedSite.addItem(savedItem);
      }
      savedContract.addSite(savedSite);
    }
    return { contract: savedContract };
  }
}
