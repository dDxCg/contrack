export interface RebalanceCandidate {
  siteId: number;
  date: Date;
  constrained: boolean;
}
export interface RebalanceResult {
  date: Date;
  moved: boolean;
}
export interface Term {
  from: Date;
  to: Date;
}
export type SiteDateCountLookup = (siteId: number, date: Date) => Promise<number>;
export class ScheduleRebalancer {
  constructor(
    private readonly countLookup: SiteDateCountLookup,
    private readonly threshold: number,
    private readonly windowDays: number,
  ) {}
  async resolve(candidates: RebalanceCandidate[], term: Term): Promise<RebalanceResult[]> {
    const batchCounts = new Map<string, number>();
    const results: RebalanceResult[] = [];
    for (const candidate of candidates) {
      const resolvedDate = await this.place(candidate, term, batchCounts);
      results.push({ date: resolvedDate, moved: resolvedDate.getTime() !== candidate.date.getTime() });
    }
    return results;
  }
  private async place(
    candidate: RebalanceCandidate,
    term: Term,
    batchCounts: Map<string, number>,
  ): Promise<Date> {
    const countAt = async (date: Date): Promise<number> => {
      const existing = await this.countLookup(candidate.siteId, date);
      return existing + (batchCounts.get(key(candidate.siteId, date)) ?? 0);
    };
    if (candidate.constrained || (await countAt(candidate.date)) < this.threshold) {
      record(batchCounts, candidate.siteId, candidate.date);
      return candidate.date;
    }
    for (const offset of nearestOffsets(this.windowDays)) {
      const altDate = addDays(candidate.date, offset);
      if (altDate.getTime() < term.from.getTime() || altDate.getTime() > term.to.getTime()) {
        continue;
      }
      if ((await countAt(altDate)) < this.threshold) {
        record(batchCounts, candidate.siteId, altDate);
        return altDate;
      }
    }
    record(batchCounts, candidate.siteId, candidate.date);
    return candidate.date;
  }
}
function key(siteId: number, date: Date): string {
  return `${siteId}|${date.toISOString().slice(0, 10)}`;
}
function record(batchCounts: Map<string, number>, siteId: number, date: Date): void {
  const k = key(siteId, date);
  batchCounts.set(k, (batchCounts.get(k) ?? 0) + 1);
}
function nearestOffsets(windowDays: number): number[] {
  const offsets: number[] = [];
  for (let i = 1; i <= windowDays; i++) {
    offsets.push(i, -i);
  }
  return offsets;
}
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
