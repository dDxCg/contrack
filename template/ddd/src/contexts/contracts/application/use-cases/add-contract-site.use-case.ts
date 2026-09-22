import { TenantId } from '../../../../shared-kernel/tenant-id';
import { ContractNotFoundError } from '../../domain/errors';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { AddContractSiteInput, ContractSiteView } from '../dto/contract.dto';
import { toContractSite, toContractSiteView } from '../dto/contract.mapper';

/**
 * AddContractSite — ported from ContractService#addSite. Unlike
 * CreateContract, adding a single site to an already-existing contract does
 * NOT require it to arrive with items (matches the original: it only
 * validates the frequency rules of any items that are passed, never their
 * count). The last site added is the one this use-case reports back;
 * the repository is expected to have assigned ids to it and to every item
 * on it by the time `update` resolves.
 */
export class AddContractSiteUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(input: AddContractSiteInput): Promise<ContractSiteView> {
    const tenantId = TenantId.of(input.tenantId);
    const contract = await this.contracts.findById(tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError(input.contractId);
    }
    const site = toContractSite(input.site);
    contract.addSite(site);
    const saved = await this.contracts.update(contract);
    const savedSite = saved.sites[saved.sites.length - 1];
    return toContractSiteView(savedSite);
  }
}
