import { Contract } from '../entities/contract';
import { ContractNotFoundError } from '../entities/errors';
import { ContractItemRepository, ContractRepository, ContractSiteRepository, TenantId } from './ports';

export interface GetContractDetailInput {
  tenantId: TenantId;
  contractId: number;
}

export interface GetContractDetailOutput {
  contract: Contract;
}

export class GetContractDetailUseCase {
  constructor(
    private readonly contracts: ContractRepository,
    private readonly sites: ContractSiteRepository,
    private readonly items: ContractItemRepository,
  ) {}

  async execute(input: GetContractDetailInput): Promise<GetContractDetailOutput> {
    const contract = await this.contracts.findById(input.tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError();
    }
    const sites = await this.sites.listByContract(input.tenantId, input.contractId);
    for (const site of sites) {
      const items = await this.items.listBySite(input.tenantId, site.id as number);
      items.forEach((item) => site.addItem(item));
      contract.addSite(site);
    }
    return { contract };
  }
}
