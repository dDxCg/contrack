import { TenantId } from '../../../../shared-kernel/tenant-id';
import { Contract } from '../../domain/contract.aggregate';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { CreateContractInput, ContractView } from '../dto/contract.dto';
import { toContractSite, toContractView } from '../dto/contract.mapper';

/**
 * CreateContract — application use-case.
 *
 * Ported from ContractService#create + the module-level `validate()` in
 * backend/services/contracts/contract.service.ts. The "at least one site,
 * each site at least one item" rule and every item's frequency rule are now
 * enforced by the domain layer itself (Contract.create / ContractSite /
 * Frequency.create), so this use-case is just: build the aggregate, ask the
 * repository to persist it, map the result to a view.
 *
 * Deliberately simplified vs. the original: this does not generate shifts,
 * run the schedule rebalancer, or fire schedule-overload alerts. Those
 * depend on the Shifts/Teams/Alerts bounded contexts, which are out of
 * scope for this contracts-only reference port. See GenerateSchedule for
 * the piece of that pipeline that DOES belong to the contracts domain
 * (computing each item's scheduled dates from its frequency).
 */
export class CreateContractUseCase {
  constructor(private readonly contracts: ContractRepositoryPort) {}

  async execute(input: CreateContractInput): Promise<ContractView> {
    const tenantId = TenantId.of(input.tenantId);
    const sites = input.sites.map(toContractSite);
    const contract = Contract.create({
      tenantId,
      customerId: input.customerId,
      signedAt: input.signedAt,
      expiresAt: input.expiresAt,
      sites,
    });
    const saved = await this.contracts.create(contract);
    return toContractView(saved);
  }
}
