import { ContractSiteNotFoundError } from '../entities/errors';
import { ContractSiteRepository, TenantId } from './ports';

export interface DeleteContractSiteInput {
  tenantId: TenantId;
  siteId: number;
}

export class DeleteContractSiteUseCase {
  constructor(private readonly sites: ContractSiteRepository) {}

  async execute(input: DeleteContractSiteInput): Promise<void> {
    const site = await this.sites.findById(input.tenantId, input.siteId);
    if (site === null) {
      throw new ContractSiteNotFoundError();
    }
    await this.sites.delete(input.tenantId, input.siteId);
  }
}
