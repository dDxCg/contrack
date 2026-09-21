export const UPLOAD_KEY_ROOT = 'uploads';
const EXTENSIONS_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export function extensionForContentType(contentType: string): string | null {
  return EXTENSIONS_BY_CONTENT_TYPE[contentType] ?? null;
}
export function uploadKeyPrefix(tenantId: number, shiftId: number): string {
  return `${UPLOAD_KEY_ROOT}/${tenantId}/${shiftId}/`;
}
export function isKeyIssuedForShift(key: string, tenantId: number, shiftId: number): boolean {
  return key.startsWith(uploadKeyPrefix(tenantId, shiftId));
}
