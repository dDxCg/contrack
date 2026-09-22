import { AlertDeliveryStatus, AlertKind } from '../../models/alerts/alert.entity';

export interface AlertView {
  id: number;
  kind: AlertKind;
  subject_id: number;
  due_in_days: number | null;
  overdue_by_days: number | null;
  delivery_status: AlertDeliveryStatus;
}
