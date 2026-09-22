import { TenantId } from '../../../../shared-kernel/tenant-id';
import { ContractNotFoundError } from '../../domain/errors';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { ContractView } from '../dto/contract.dto';
import { toContractView } from '../dto/contract.mapper';

/** GetContractDetail — ported from ContractService#get. Note the original raised AuthOutOfScopeException on a miss (never leaking whether the id exists for another tenant); this port raises the contracts-domain-specific ContractNotFoundError instead, since access-control's "don't leak existence across tenants" concern lives in its own bounded context, not here. */
export class GetContractDetailUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(tenantIdRaw: number, contractId: number): Promise<ContractView> {
    const tenantId = TenantId.of(tenantIdRaw);
    const contract = await this.contracts.findById(tenantId, contractId);
    if (contract === null) {
      throw new ContractNotFoundError(contractId);
    }
    return toContractView(contract);
  }
}
