import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { ContractSite } from '../../models/contracts/contract-site.entity';
import { TenantScopedRepository } from '../tenant-scoped.repository';
export interface IContractSiteRepository {
  create(site: ContractSite, tx?: EntityManager): Promise<ContractSite>;
  findById(tenantId: number, id: number, tx?: EntityManager): Promise<ContractSite | null>;
  update(site: ContractSite, tx?: EntityManager): Promise<ContractSite>;
  delete(tenantId: number, id: number, tx?: EntityManager): Promise<void>;
}
@Injectable()
export class ContractSiteRepository
  extends TenantScopedRepository<ContractSite>
  implements IContractSiteRepository
{
  protected override readonly entity: EntityTarget<ContractSite> = ContractSite;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }
  async create(site: ContractSite, tx?: EntityManager): Promise<ContractSite> {
    return this.mgr(tx).getRepository(ContractSite).save(site);
  }
  async findById(tenantId: number, id: number, tx?: EntityManager): Promise<ContractSite | null> {
    return this.mgr(tx).getRepository(ContractSite).findOneBy({ id, tenantId });
  }
  async update(site: ContractSite, tx?: EntityManager): Promise<ContractSite> {
    return this.mgr(tx).getRepository(ContractSite).save(site);
  }
  async delete(tenantId: number, id: number, tx?: EntityManager): Promise<void> {
    await this.mgr(tx).getRepository(ContractSite).delete({ id, tenantId });
  }
}
