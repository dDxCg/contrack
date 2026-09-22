import { ContractNotFoundError } from '../entities/errors';
import { ContractRepository, TenantId } from './ports';

export interface DeleteContractInput {
  tenantId: TenantId;
  contractId: number;
}

export class DeleteContractUseCase {
  constructor(private readonly contracts: ContractRepository) {}

  async execute(input: DeleteContractInput): Promise<void> {
    const contract = await this.contracts.findById(input.tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError();
    }
    await this.contracts.delete(input.tenantId, input.contractId);
  }
}
