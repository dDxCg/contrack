import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import { DATA_SOURCE } from '../Data/DbContext/data-source';
import { ContractSite } from '../Models/contract-site.entity';
import { TenantScopedRepository } from './tenant-scoped.repository';

@Injectable()
export class ContractSiteRepository extends TenantScopedRepository<ContractSite> {
  protected override readonly entity: EntityTarget<ContractSite> = ContractSite;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    super(dataSource);
  }

  async create(site: ContractSite): Promise<ContractSite> {
    return this.dataSource.getRepository(ContractSite).save(site);
  }
}
