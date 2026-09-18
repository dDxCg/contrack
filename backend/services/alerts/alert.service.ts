import { Inject, Injectable } from '@nestjs/common';
import { ChannelClient, CHANNEL_CLIENT } from '../../data/channel-client/channel-client';
import { AlertView } from '../../dtos/alerts/alerts.response.dto';
import { AuthOutOfScopeException, AlertChannelUnavailableException } from '../../models/domain-errors';
import { Alert, AlertDeliveryStatus, AlertKind } from '../../models/alerts/alert.entity';
import { AlertRepository } from '../../repositories/alerts/alert.repository';
import { AccessContext } from '../access-control/access-context';
@Injectable()
export class AlertService {
  constructor(
    private readonly alertRepository: AlertRepository,
    @Inject(CHANNEL_CLIENT)
    private readonly channelClient: ChannelClient,
  ) {}
  async list(access: AccessContext): Promise<AlertView[]> {
    return (await this.alertRepository.list(access.tenantId)).map(toAlertView);
  }
  async resend(access: AccessContext, id: number): Promise<AlertView> {
    const alert = await this.requireAlert(access, id);
    const status = await this.channelClient.send(messageFor(alert));
    alert.setDeliveryStatus(status);
    const saved = await this.alertRepository.update(alert);
    if (status === AlertDeliveryStatus.NotSent) {
      throw new AlertChannelUnavailableException();
    }
    return toAlertView(saved);
  }
  private async requireAlert(access: AccessContext, id: number): Promise<Alert> {
    const alert = await this.alertRepository.findById(access.tenantId, id);
    if (alert === null) {
      throw new AuthOutOfScopeException();
    }
    return alert;
  }
}
function messageFor(alert: Alert): string {
  return alert.kind === AlertKind.ContractExpiring
    ? `Hợp đồng #${alert.subjectId} sắp hết hạn`
    : `Ca #${alert.subjectId} đã trễ hẹn`;
}
function toAlertView(alert: Alert): AlertView {
  return {
    id: alert.id,
    kind: alert.kind,
    subject_id: alert.subjectId,
    due_in_days: null,
    overdue_by_days: null,
    delivery_status: alert.deliveryStatus,
  };
}
