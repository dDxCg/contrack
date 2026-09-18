import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { ContractItem } from '../../models/contracts/contract-item.entity';
import { TenantScopedRepository } from '../tenant-scoped.repository';
export interface IContractItemRepository {
  create(item: ContractItem, tx?: EntityManager): Promise<ContractItem>;
}
@Injectable()
export class ContractItemRepository
  extends TenantScopedRepository<ContractItem>
  implements IContractItemRepository
{
  protected override readonly entity: EntityTarget<ContractItem> = ContractItem;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }
  async create(item: ContractItem, tx?: EntityManager): Promise<ContractItem> {
    item.frequencyUnitId = await this.lookupId('frequency_units', item.frequencyUnit, tx);
    return this.mgr(tx).getRepository(ContractItem).save(item);
  }
}
