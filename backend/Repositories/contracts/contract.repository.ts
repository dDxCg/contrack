import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Contract, ContractStatus } from '../../models/contracts/contract.entity';
import { Page, PageOf, TenantScopedRepository } from '../tenant-scoped.repository';

@Injectable()
export class ContractRepository extends TenantScopedRepository<Contract> {
  protected override readonly entity: EntityTarget<Contract> = Contract;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    super(dataSource);
  }

  async list(tenantId: number, page: Page): Promise<PageOf<Contract>> {
    const rows = await this.selected(tenantId)
      .orderBy('c.id', 'ASC')
      .limit(page.limit)
      .offset(page.offset)
      .getRawMany<ContractRow>();
    const total = await this.scopedTo(tenantId, 'c').getCount();

    return { items: rows.map(hydrateContract), total };
  }

  async findById(tenantId: number, id: number): Promise<Contract | null> {
    const row = await this.selected(tenantId).andWhere('c.id = :id', { id }).getRawOne<ContractRow>();

    return row === undefined || row === null ? null : hydrateContract(row);
  }

  async create(contract: Contract): Promise<Contract> {
    contract.statusId = await this.lookupId('contract_statuses', contract.status);

    return this.saveAndReload(contract);
  }

  async update(contract: Contract): Promise<Contract> {
    contract.statusId = await this.lookupId('contract_statuses', contract.status);

    return this.saveAndReload(contract);
  }

  async delete(tenantId: number, id: number): Promise<void> {
    await this.dataSource.getRepository(Contract).delete({ id, tenantId });
  }

  async expiringWithin(tenantId: number, from: string, to: string): Promise<Contract[]> {
    const rows = await this.selected(tenantId)
      .andWhere("s.code = 'active'")
      .andWhere('c.expires_at >= :from AND c.expires_at <= :to', { from, to })
      .getRawMany<ContractRow>();

    return rows.map(hydrateContract);
  }

  async countByStatus(tenantId: number, status: ContractStatus): Promise<number> {
    return this.scopedTo(tenantId, 'c')
      .innerJoin('contract_statuses', 's', 's.id = c.status_id')
      .andWhere('s.code = :status', { status })
      .getCount();
  }

  private selected(tenantId: number): SelectQueryBuilder<Contract> {
    return this.scopedTo(tenantId, 'c')
      .innerJoin('contract_statuses', 's', 's.id = c.status_id')
      .select([
        'c.id AS id',
        'c.tenant_id AS tenant_id',
        'c.customer_id AS customer_id',
        'c.signed_at AS signed_at',
        'c.expires_at AS expires_at',
        'c.status_id AS status_id',
        'c.created_at AS created_at',
        's.code AS status',
      ]);
  }

  private async saveAndReload(contract: Contract): Promise<Contract> {
    const saved = await this.dataSource.getRepository(Contract).save(contract);
    const reloaded = await this.findById(saved.tenantId, saved.id);

    if (reloaded === null) {
      throw new Error(`contracts row ${saved.id} disappeared right after it was written`);
    }

    return reloaded;
  }
}

interface ContractRow {
  id: number;
  tenant_id: number;
  customer_id: number;
  signed_at: Date;
  expires_at: Date;
  status_id: number;
  created_at: Date;
  status: ContractStatus;
}

function hydrateContract(row: ContractRow): Contract {
  const contract = new Contract();
  contract.id = row.id;
  contract.tenantId = row.tenant_id;
  contract.customerId = row.customer_id;
  contract.signedAt = row.signed_at;
  contract.expiresAt = row.expires_at;
  contract.statusId = row.status_id;
  contract.createdAt = row.created_at;
  contract.status = row.status;

  return contract;
}
