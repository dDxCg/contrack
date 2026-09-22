import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ChannelClient, CHANNEL_CLIENT } from '../../data/channel-client/channel-client';
import { AlertKind } from '../../models/alerts/alert.entity';
import { AlertRepository, IAlertRepository } from '../../repositories/alerts/alert.repository';
import { ContractRepository, IContractRepository } from '../../repositories/contracts/contract.repository';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { ITenantRepository, TenantRepository } from '../../repositories/tenants/tenant.repository';
import { CLOCK, IClock } from '../access-control/clock';
import { fireAlert } from './alert-firer';
import { addDaysUTC, toDateString, toDateStringInZone } from '../../utils/period';

const EXPIRY_THRESHOLD_DAYS = 30;

export interface AlertJobSummary {
  sent: number;
  skipped: number;
}

@Injectable()
export class AlertJobService {
  constructor(
    @Inject(ContractRepository)
    private readonly contractRepository: IContractRepository,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(AlertRepository)
    private readonly alertRepository: IAlertRepository,
    @Inject(TenantRepository)
    private readonly tenantRepository: ITenantRepository,
    @Inject(CHANNEL_CLIENT)
    private readonly channelClient: ChannelClient,
    @Inject(CLOCK)
    private readonly clock: IClock,
    @InjectPinoLogger(AlertJobService.name)
    private readonly logger: PinoLogger,
  ) {}

  async runAll(): Promise<AlertJobSummary> {
    const total: AlertJobSummary = { sent: 0, skipped: 0 };

    for (const tenantId of await this.tenantRepository.activeIds()) {
      try {
        const summary = await this.run(tenantId);
        total.sent += summary.sent;
        total.skipped += summary.skipped;
      } catch (error) {
        this.logger.error(
          { tenantId, err: error },
          'daily alert run failed for tenant — continuing with the next tenant',
        );
      }
    }

    return total;
  }

  async run(tenantId: number): Promise<AlertJobSummary> {
    const timezone = await this.tenantRepository.timezoneOf(tenantId);
    const today = toDateStringInZone(this.clock.now(), timezone);
    const todayStart = new Date(`${today}T00:00:00.000Z`);
    const summary: AlertJobSummary = { sent: 0, skipped: 0 };
    const expiring = await this.contractRepository.expiringWithin(
      tenantId,
      today,
      toDateString(addDaysUTC(todayStart, EXPIRY_THRESHOLD_DAYS)),
    );

    for (const contract of expiring) {
      await this.fire(tenantId, AlertKind.ContractExpiring, contract.id, summary);
    }

    const overdue = await this.shiftRepository.overdue(tenantId, today);

    for (const shift of overdue) {
      await this.fire(tenantId, AlertKind.ShiftOverdue, shift.id, summary);
    }

    return summary;
  }

  private async fire(
    tenantId: number,
    kind: AlertKind,
    subjectId: number,
    summary: AlertJobSummary,
  ): Promise<void> {
    const fired = await fireAlert(
      { alertRepository: this.alertRepository, channelClient: this.channelClient },
      tenantId,
      kind,
      subjectId,
    );

    if (fired) {
      summary.sent += 1;
    } else {
      summary.skipped += 1;
    }
  }
}
