import { PageView } from '../page.dto';

export interface ShiftView {
  id: number;
  contract_item_id: number;
  assignee_id: number | null;
  team_id: number | null;
  scheduled_date: string;
  completed_at: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  geo_verified: boolean;
  captured_at: string | null;
  receipt_photo_url: string | null;
  dispute_reason: string | null;
  dispute_reported_via: string | null;
  dispute_reported_by: string | null;
  dispute_reported_at: string | null;
  dispute_description: string | null;
}

export type ShiftPage = PageView<ShiftView>;
