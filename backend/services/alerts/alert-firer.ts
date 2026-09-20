import { ChannelClient } from '../../data/channel-client/channel-client';
import { Alert, AlertKind } from '../../models/alerts/alert.entity';
import { IAlertRepository } from '../../repositories/alerts/alert.repository';
import { messageFor } from './messages';
export interface AlertFirerDeps {
  alertRepository: IAlertRepository;
  channelClient: ChannelClient;
}
export async function fireAlert(
  deps: AlertFirerDeps,
  tenantId: number,
  kind: AlertKind,
  subjectId: number,
): Promise<boolean> {
  if (await deps.alertRepository.existsFor(tenantId, kind, subjectId)) {
    return false;
  }
  const deliveryStatus = await deps.channelClient.send(messageFor(kind, subjectId));
  const alert = new Alert();
  alert.tenantId = tenantId;
  alert.kind = kind;
  alert.subjectId = subjectId;
  alert.deliveryStatus = deliveryStatus;
  await deps.alertRepository.create(alert);
  return true;
}
