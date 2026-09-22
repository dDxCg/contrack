export interface RebalanceCandidate {
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

export class ScheduleRebalancer {
  constructor(
    private readonly counts: Map<string, number>,
    private readonly capacity: number,
    private readonly windowDays: number,
  ) {}

  resolve(candidates: RebalanceCandidate[], term: Term): RebalanceResult[] {
    const counts = new Map(this.counts);

    return candidates.map((candidate) => {
      const resolvedDate = this.place(candidate, term, counts);

      return { date: resolvedDate, moved: resolvedDate.getTime() !== candidate.date.getTime() };
    });
  }

  private place(candidate: RebalanceCandidate, term: Term, counts: Map<string, number>): Date {
    const countAt = (date: Date): number => counts.get(key(date)) ?? 0;

    if (candidate.constrained || countAt(candidate.date) < this.capacity) {
      record(counts, candidate.date);

      return candidate.date;
    }

    for (const offset of nearestOffsets(this.windowDays)) {
      const altDate = addDays(candidate.date, offset);

      if (altDate.getTime() < term.from.getTime() || altDate.getTime() > term.to.getTime()) {
        continue;
      }

      if (countAt(altDate) < this.capacity) {
        record(counts, altDate);

        return altDate;
      }
    }

    record(counts, candidate.date);

    return candidate.date;
  }
}

function key(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function record(counts: Map<string, number>, date: Date): void {
  const k = key(date);
  counts.set(k, (counts.get(k) ?? 0) + 1);
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
