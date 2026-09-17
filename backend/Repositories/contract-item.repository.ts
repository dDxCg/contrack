import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import { DATA_SOURCE } from '../Data/DbContext/data-source';
import { ContractItem } from '../Models/contract-item.entity';
import { TenantScopedRepository } from './tenant-scoped.repository';

@Injectable()
export class ContractItemRepository extends TenantScopedRepository<ContractItem> {
  protected override readonly entity: EntityTarget<ContractItem> = ContractItem;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    super(dataSource);
  }

  async create(item: ContractItem): Promise<ContractItem> {
    item.frequencyUnitId = await this.lookupId('frequency_units', item.frequencyUnit);

    return this.dataSource.getRepository(ContractItem).save(item);
  }
}
