export interface FieldLinkView {
  token: string;
  url: string;
  expires_at: string;
}
export interface UploadTargetView {
  upload_url: string;
  key: string;
}
export interface FieldContextView {
  contract_site: string;
  service_item: string;
  scheduled_at: string;
  remaining_steps: ('before_photo' | 'after_photo' | 'receipt_photo')[];
}
