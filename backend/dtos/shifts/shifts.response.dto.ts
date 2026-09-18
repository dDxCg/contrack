export interface ShiftView {
  id: number;
  contract_item_id: number;
  assignee_id: number | null;
  scheduled_date: string;
  completed_at: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  geo_verified: boolean;
  captured_at: string | null;
  receipt_photo_url: string | null;
}
