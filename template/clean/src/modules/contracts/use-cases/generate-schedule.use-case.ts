import { FrequencyUnit } from '../entities/contract-item';
import { ScheduleGenerator, Term } from './schedule-generator';

// Demonstrates the ported schedule-generator date math as its own use case:
// given a contract's term and one item's frequency, produce the calendar
// dates a shift would occur on. In the full backend this feeds shift
// creation (services/contracts/contract-assembler.ts +
// schedule-rebalancer.ts); shift/team capacity rebalancing is a different
// bounded context (the shifts/teams domains) that this narrowed port
// deliberately excludes — see README.md.
export interface GenerateScheduleInput {
  from: Date;
  to: Date;
  frequencyCount: number;
  frequencyUnit: FrequencyUnit;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
}

export interface GenerateScheduleOutput {
  dates: Date[];
}

export class GenerateScheduleUseCase {
  constructor(private readonly generator: ScheduleGenerator = new ScheduleGenerator()) {}

  execute(input: GenerateScheduleInput): GenerateScheduleOutput {
    const term: Term = { from: input.from, to: input.to };
    const dates = this.generator.generate(term, {
      frequencyCount: input.frequencyCount,
      frequencyUnit: input.frequencyUnit,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
    });
    return { dates };
  }
}
