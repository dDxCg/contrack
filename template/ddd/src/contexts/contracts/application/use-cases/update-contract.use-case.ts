import { TenantId } from '../../../../shared-kernel/tenant-id';
import { ContractNotFoundError } from '../../domain/errors';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { ContractView, UpdateContractInput } from '../dto/contract.dto';
import { toContractView } from '../dto/contract.mapper';

/** UpdateContract — ported from ContractService#update. Only expiresAt/status are mutable, same as the original (signedAt is immutable post-creation). */
export class UpdateContractUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(input: UpdateContractInput): Promise<ContractView> {
    const tenantId = TenantId.of(input.tenantId);
    const contract = await this.contracts.findById(tenantId, input.contractId);
    if (contract === null) {
      throw new ContractNotFoundError(input.contractId);
    }
    if (input.expiresAt !== undefined) {
      contract.changeExpiry(input.expiresAt);
    }
    if (input.status !== undefined) {
      contract.changeStatus(input.status);
    }
    const saved = await this.contracts.update(contract);
    return toContractView(saved);
  }
}
