import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChannelClient, CHANNEL_CLIENT } from '../../data/channel-client/channel-client';
import { Alert, AlertKind } from '../../models/alerts/alert.entity';
import { AlertRepository } from '../../repositories/alerts/alert.repository';
import { ContractRepository } from '../../repositories/contracts/contract.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { TenantRepository } from '../../repositories/tenants/tenant.repository';
import { CLOCK, IClock } from '../access-control/clock';
import { addDaysUTC, toDateString } from '../../utils/period';
const EXPIRY_THRESHOLD_DAYS = 30;
export interface AlertJobSummary {
  sent: number;
  skipped: number;
}
@Injectable()
export class AlertJobService {
  private readonly logger = new Logger(AlertJobService.name);
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly shiftRepository: ShiftRepository,
    private readonly alertRepository: AlertRepository,
    private readonly tenantRepository: TenantRepository,
    @Inject(CHANNEL_CLIENT)
    private readonly channelClient: ChannelClient,
    @Inject(CLOCK)
    private readonly clock: IClock,
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
          `daily alert run failed for tenant ${tenantId} — continuing with the next tenant`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return total;
  }
  async run(tenantId: number): Promise<AlertJobSummary> {
    const today = toDateString(this.clock.now());
    const summary: AlertJobSummary = { sent: 0, skipped: 0 };
    const expiring = await this.contractRepository.expiringWithin(
      tenantId,
      today,
      toDateString(addDaysUTC(this.clock.now(), EXPIRY_THRESHOLD_DAYS)),
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
    if (await this.alertRepository.existsFor(tenantId, kind, subjectId)) {
      summary.skipped += 1;
      return;
    }
    const deliveryStatus = await this.channelClient.send(messageFor(kind, subjectId));
    const alert = new Alert();
    alert.tenantId = tenantId;
    alert.kind = kind;
    alert.subjectId = subjectId;
    alert.deliveryStatus = deliveryStatus;
    await this.alertRepository.create(alert);
    summary.sent += 1;
  }
}
function messageFor(kind: AlertKind, subjectId: number): string {
  return kind === AlertKind.ContractExpiring
    ? `Hợp đồng #${subjectId} sắp hết hạn`
    : `Ca #${subjectId} đã trễ hẹn`;
}
