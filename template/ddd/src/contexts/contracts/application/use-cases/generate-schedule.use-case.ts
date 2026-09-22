import { TenantId } from '../../../../shared-kernel/tenant-id';
import { ContractNotFoundError } from '../../domain/errors';
import { ContractRepositoryPort } from '../../domain/contract-repository.port';
import { ScheduleGeneratorDomainService } from '../../domain/schedule-generator.domain-service';
import { DateRange } from '../../domain/value-objects/date-range';

export interface ScheduledItemDates {
  siteId: number;
  itemId: number;
  dates: Date[];
}

/**
 * GenerateSchedule — application use-case wrapping
 * ScheduleGeneratorDomainService.
 *
 * Ported from the scheduling half of ContractAssembler#assemble
 * (backend/services/contracts/contract-assembler.ts): for every item on
 * every site, compute the dates that item's frequency lands on across the
 * contract's signed/expiry window.
 *
 * Deliberately simplified vs. the original: this only returns the computed
 * dates. It does not create Shift rows, run ScheduleRebalancer to spread
 * shifts across team capacity, or fire schedule-overload alerts — those
 * three steps depend on the Shifts, Teams and Alerts bounded contexts
 * (Team/Shift repositories, capacity math), which are out of scope for this
 * contracts-only reference port. The pure date-math piece that DOES belong
 * to the contracts domain is ported here near-verbatim.
 */
export class GenerateScheduleUseCase {
  constructor(
    private readonly contracts: ContractRepositoryPort,
    private readonly scheduleGenerator: ScheduleGeneratorDomainService = new ScheduleGeneratorDomainService(),
  ) {}

  async execute(tenantIdRaw: number, contractId: number): Promise<ScheduledItemDates[]> {
    const tenantId = TenantId.of(tenantIdRaw);
    const contract = await this.contracts.findById(tenantId, contractId);
    if (contract === null) {
      throw new ContractNotFoundError(contractId);
    }
    const range = DateRange.of(contract.signedAt, contract.expiresAt);
    const results: ScheduledItemDates[] = [];
    for (const site of contract.sites) {
      if (site.id === null) {
        continue;
      }
      for (const item of site.items) {
        if (item.id === null) {
          continue;
        }
        results.push({
          siteId: site.id,
          itemId: item.id,
          dates: this.scheduleGenerator.generate(range, item.frequency),
        });
      }
    }
    return results;
  }
}
