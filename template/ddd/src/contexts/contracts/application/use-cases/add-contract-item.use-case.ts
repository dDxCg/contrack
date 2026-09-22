import { TenantId } from '../../../../shared-kernel/tenant-id';
import { ContractNotFoundError, ContractSiteNotFoundError } from '../../domain/errors';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { AddContractItemInput, ContractItemView } from '../dto/contract.dto';
import { toContractItem, toContractItemView } from '../dto/contract.mapper';

/** AddContractItem — ported from ContractService#addItem. The frequency invariants are enforced by Frequency.create() inside toContractItem(); an invalid frequency throws InvalidFrequencyError before the site is ever touched. */
export class AddContractItemUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(input: AddContractItemInput): Promise<ContractItemView> {
    const tenantId = TenantId.of(input.tenantId);
    const contract = await this.contracts.findById(tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError(input.contractId);
    }
    const site = contract.findSite(input.siteId);
    if (site === undefined) {
      throw new ContractSiteNotFoundError(input.siteId);
    }
    const item = toContractItem(input.item);
    site.addItem(item);
    const saved = await this.contracts.update(contract);
    const savedSite = saved.findSite(input.siteId);
    /* istanbul ignore next -- defensive: the repository must round-trip the site it was just given */
    if (savedSite === undefined) {
      throw new ContractSiteNotFoundError(input.siteId);
    }
    const savedItem = savedSite.items[savedSite.items.length - 1];
    return toContractItemView(savedItem);
  }
}
