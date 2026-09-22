import { TenantId } from '../../../../shared-kernel/tenant-id';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { ContractPage, Page } from '../dto/contract.dto';
import { toContractView } from '../dto/contract.mapper';

/**
 * ListContracts — tenant-scoped pagination, ported from ContractService#list.
 * The tenant scoping is structural: this use-case cannot call
 * `contracts.list` without a TenantId, so "list contracts across all
 * tenants" is not an expressible bug.
 */
export class ListContractsUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(tenantIdRaw: number, page: Page): Promise<ContractPage> {
    const tenantId = TenantId.of(tenantIdRaw);
    const { items, total } = await this.contracts.list(tenantId, page);
    return {
      items: items.map(toContractView),
      total,
      limit: page.limit,
      offset: page.offset,
    };
  }
}
