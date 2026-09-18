import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DISTRIBUTED_LOCK, DistributedLock } from './distributed-lock';
import { AlertJobService } from './alert-job.service';

const ALERTS_DAILY_LOCK = 'alerts:daily';
const ALERTS_LOCK_TTL_SECONDS = 300;

@Injectable()
export class AlertJobScheduler {
  private readonly logger = new Logger(AlertJobScheduler.name);
  constructor(
    private readonly job: AlertJobService,
    @Inject(DISTRIBUTED_LOCK)
    private readonly lock: DistributedLock,
  ) {}
  @Cron('0 0 6 * * *')
  async scheduled(): Promise<void> {
    if (!(await this.lock.tryAcquire(ALERTS_DAILY_LOCK, ALERTS_LOCK_TTL_SECONDS))) {
      this.logger.log('daily alert run already taken by another instance — skipping');
      return;
    }
    try {
      this.logger.log('daily alert run starting');
      await this.job.runAll();
      this.logger.log('daily alert run finished');
    } finally {
      await this.lock.release(ALERTS_DAILY_LOCK);
    }
  }
}
