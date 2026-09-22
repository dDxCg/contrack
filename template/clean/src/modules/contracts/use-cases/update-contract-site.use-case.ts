import { ContractSite } from '../entities/contract-site';
import { ContractSiteNotFoundError } from '../entities/errors';
import { ContractSiteRepository, TenantId } from './ports';

export interface UpdateContractSiteInput {
  tenantId: TenantId;
  siteId: number;
  name: string;
  workRequirements: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

export interface UpdateContractSiteOutput {
  site: ContractSite;
}

export class UpdateContractSiteUseCase {
  constructor(private readonly sites: ContractSiteRepository) {}

  async execute(input: UpdateContractSiteInput): Promise<UpdateContractSiteOutput> {
    const site = await this.sites.findById(input.tenantId, input.siteId);
    if (site === null) {
      throw new ContractSiteNotFoundError();
    }
    site.setName(input.name);
    site.setWorkRequirements(input.workRequirements);
    site.setNotes(input.notes);
    site.setLocation(input.latitude, input.longitude, input.radiusMeters);
    const saved = await this.sites.update(site);
    return { site: saved };
  }
}
