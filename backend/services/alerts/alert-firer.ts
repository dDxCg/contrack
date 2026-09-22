import { ChannelClient } from '../../data/channel-client/channel-client';
import { Alert, AlertDeliveryStatus, AlertKind } from '../../models/alerts/alert.entity';
import { IAlertRepository } from '../../repositories/alerts/alert.repository';
import { withUniqueViolation } from '../../repositories/unique-violation';
import { messageFor } from './messages';

export interface AlertFirerDeps {
  alertRepository: IAlertRepository;
  channelClient: ChannelClient;
}

class AlertAlreadyFiredError extends Error {}

export async function fireAlert(
  deps: AlertFirerDeps,
  tenantId: number,
  kind: AlertKind,
  subjectId: number,
): Promise<boolean> {
  const alert = new Alert();
  alert.tenantId = tenantId;
  alert.kind = kind;
  alert.subjectId = subjectId;
  alert.deliveryStatus = AlertDeliveryStatus.NotSent;

  let created: Alert;

  try {
    created = await withUniqueViolation(
      () => deps.alertRepository.create(alert),
      () => new AlertAlreadyFiredError(),
    );
  } catch (error) {
    if (error instanceof AlertAlreadyFiredError) {
      return false;
    }

    throw error;
  }

  const deliveryStatus = await deps.channelClient.send(messageFor(kind, subjectId));
  created.deliveryStatus = deliveryStatus;
  await deps.alertRepository.update(created);

  return true;
}
