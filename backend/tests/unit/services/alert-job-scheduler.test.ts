import { AlertJobScheduler } from '../../../services/alerts/alert-job-scheduler.service';
import type { AlertJobService } from '../../../services/alerts/alert-job.service';
import type { DistributedLock } from '../../../services/alerts/distributed-lock';

function world(lockBusy = false) {
  const runAll = jest.fn().mockResolvedValue({ sent: 0, skipped: 0 });
  const job = { runAll } as unknown as AlertJobService;
  const lock = {
    tryAcquire: jest.fn().mockResolvedValue(!lockBusy),
    release: jest.fn().mockResolvedValue(undefined),
  } as unknown as DistributedLock & Record<'tryAcquire' | 'release', jest.Mock>;
  const logger = { info: jest.fn() };
  const scheduler = new AlertJobScheduler(job, lock, logger as never);

  return { scheduler, runAll, lock };
}

describe('AlertJobScheduler — the daily trigger (FR25/FR26)', () => {
  it('on the cron tick, takes the distributed lock, fans out, and releases', async () => {
    const { scheduler, runAll, lock } = world();
    await scheduler.scheduled();
    expect(lock.tryAcquire).toHaveBeenCalledWith('alerts:daily', 300);
    expect(runAll).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledWith('alerts:daily');
  });
  it('skips the run entirely when another pod already holds the daily lock', async () => {
    const { scheduler, runAll, lock } = world(true);
    await scheduler.scheduled();
    expect(runAll).not.toHaveBeenCalled();
    expect(lock.release).not.toHaveBeenCalled();
  });
  it('releases the lock even when the fan-out throws', async () => {
    const { scheduler, runAll, lock } = world();
    runAll.mockRejectedValue(new Error('database unavailable'));
    await expect(scheduler.scheduled()).rejects.toThrow('database unavailable');
    expect(lock.release).toHaveBeenCalledWith('alerts:daily');
  });
});
