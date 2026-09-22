import { RebalanceCandidate, ScheduleRebalancer } from '../../../services/contracts/schedule-rebalancer';

const term = { from: new Date('2024-01-01'), to: new Date('2024-01-31') };

function candidate(date: string, constrained = false): RebalanceCandidate {
  return { date: new Date(date), constrained };
}

describe('ScheduleRebalancer', () => {
  it('places a candidate on its own date when capacity allows, without any lookup calls', () => {
    const counts = new Map<string, number>();
    const rebalancer = new ScheduleRebalancer(counts, 2, 3);

    const results = rebalancer.resolve([candidate('2024-01-10')], term);

    expect(results).toEqual([{ date: new Date('2024-01-10'), moved: false }]);
  });

  it('moves a candidate to the nearest under-capacity date within the window, from a prefetched snapshot', () => {
    const counts = new Map<string, number>([['2024-01-10', 2]]);
    const rebalancer = new ScheduleRebalancer(counts, 2, 3);

    const results = rebalancer.resolve([candidate('2024-01-10')], term);

    expect(results).toEqual([{ date: new Date('2024-01-11'), moved: true }]);
  });

  it('never places a constrained candidate anywhere but its own date', () => {
    const counts = new Map<string, number>([['2024-01-10', 99]]);
    const rebalancer = new ScheduleRebalancer(counts, 2, 3);

    const results = rebalancer.resolve([candidate('2024-01-10', true)], term);

    expect(results).toEqual([{ date: new Date('2024-01-10'), moved: false }]);
  });

  it('accounts for candidates already placed earlier in the same batch, without re-querying', () => {
    const counts = new Map<string, number>();
    const rebalancer = new ScheduleRebalancer(counts, 1, 3);

    const results = rebalancer.resolve([candidate('2024-01-10'), candidate('2024-01-10')], term);

    expect(results).toEqual([
      { date: new Date('2024-01-10'), moved: false },
      { date: new Date('2024-01-11'), moved: true },
    ]);
  });

  it('falls back to the original date when every date in the window is at capacity', () => {
    const counts = new Map<string, number>();

    for (let day = 1; day <= 31; day++) {
      counts.set(`2024-01-${String(day).padStart(2, '0')}`, 5);
    }

    const rebalancer = new ScheduleRebalancer(counts, 1, 3);

    const results = rebalancer.resolve([candidate('2024-01-10')], term);

    expect(results).toEqual([{ date: new Date('2024-01-10'), moved: false }]);
  });
});
