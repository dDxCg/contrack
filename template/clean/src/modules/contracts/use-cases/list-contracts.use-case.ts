import { Contract } from '../entities/contract';
import { ContractRepository, Page, TenantId } from './ports';

export interface ListContractsInput {
  tenantId: TenantId;
  page: Page;
}

export interface ListContractsOutput {
  items: Contract[];
  total: number;
  limit: number;
  offset: number;
}

// Tenant-scoped by construction: the only way to reach the repository is
// through this input's tenantId, so there is no code path that can list
// another tenant's contracts.
export class ListContractsUseCase {
  constructor(private readonly contracts: ContractRepository) {}

  async execute(input: ListContractsInput): Promise<ListContractsOutput> {
    const { items, total } = await this.contracts.list(input.tenantId, input.page);
    return { items, total, limit: input.page.limit, offset: input.page.offset };
  }
}
