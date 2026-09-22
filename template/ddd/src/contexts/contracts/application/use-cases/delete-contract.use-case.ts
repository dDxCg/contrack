import { TenantId } from '../../../../shared-kernel/tenant-id';
import { ContractNotFoundError } from '../../domain/errors';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';

/** DeleteContract — ported from ContractService#delete. Confirms the contract exists for this tenant before deleting, same as the original's requireContract() guard. */
export class DeleteContractUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(tenantIdRaw: number, contractId: number): Promise<void> {
    const tenantId = TenantId.of(tenantIdRaw);
    const contract = await this.contracts.findById(tenantId, contractId);
    if (contract === null) {
      throw new ContractNotFoundError(contractId);
    }
    await this.contracts.delete(tenantId, contractId);
  }
}
