import { Alert } from '../../models/alerts/alert.entity';
import { AlertView } from './alerts.response.dto';
export function toAlertView(alert: Alert): AlertView {
  return {
    id: alert.id,
    kind: alert.kind,
    subject_id: alert.subjectId,
    due_in_days: null,
    overdue_by_days: null,
    delivery_status: alert.deliveryStatus,
  };
}
