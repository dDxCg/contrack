export interface UploadTarget {
  uploadUrl: string;
  key: string;
}
export interface PresignUploadInput {
  key: string;
  contentType: string;
}
export interface ObjectStorageClient {
  presignUpload(input: PresignUploadInput): Promise<UploadTarget>;
}
export const OBJECT_STORAGE_CLIENT = Symbol('OBJECT_STORAGE_CLIENT');
