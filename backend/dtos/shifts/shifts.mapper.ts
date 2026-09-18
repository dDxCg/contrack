import { Shift } from '../../models/shifts/shift.entity';
import { ShiftView } from './shifts.response.dto';
export function toShiftView(shift: Shift): ShiftView {
  return {
    id: shift.id,
    contract_item_id: shift.contractItemId,
    assignee_id: shift.assigneeId,
    scheduled_date: shift.scheduledDate.toString(),
    completed_at: shift.completedAt === null ? null : shift.completedAt.toString(),
    status: shift.status,
    latitude: shift.latitude,
    longitude: shift.longitude,
    geo_verified: shift.geoVerified,
    captured_at: shift.capturedAt === null ? null : shift.capturedAt.toString(),
    receipt_photo_url: shift.receiptPhotoUrl,
  };
}
