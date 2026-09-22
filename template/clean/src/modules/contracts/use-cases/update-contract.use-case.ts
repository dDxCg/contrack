import { Contract, ContractStatus } from '../entities/contract';
import { ContractNotFoundError } from '../entities/errors';
import { ContractRepository, TenantId } from './ports';

export interface UpdateContractInput {
  tenantId: TenantId;
  contractId: number;
  expiresAt?: Date;
  status?: ContractStatus;
}

export interface UpdateContractOutput {
  contract: Contract;
}

export class UpdateContractUseCase {
  constructor(private readonly contracts: ContractRepository) {}

  async execute(input: UpdateContractInput): Promise<UpdateContractOutput> {
    const contract = await this.contracts.findById(input.tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError();
    }
    if (input.expiresAt !== undefined) {
      contract.setTerm(contract.signedAt, input.expiresAt);
    }
    if (input.status !== undefined) {
      contract.setStatus(input.status);
    }
    const saved = await this.contracts.update(contract);
    return { contract: saved };
  }
}
