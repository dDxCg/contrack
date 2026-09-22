export interface UploadTarget {
  uploadUrl: string;
  key: string;
}

export interface PresignUploadInput {
  key: string;
  contentType: string;
}

export interface PutObjectInput {
  key: string;
  contentType: string;
  body: Buffer;
}

export interface PresignDownloadInput {
  key: string;
}

export interface DownloadTarget {
  url: string;
}

export interface ObjectStorageClient {
  presignUpload(input: PresignUploadInput): Promise<UploadTarget>;
  putObject(input: PutObjectInput): Promise<{ key: string }>;
  presignDownload(input: PresignDownloadInput): Promise<DownloadTarget>;
}

export const OBJECT_STORAGE_CLIENT = Symbol('OBJECT_STORAGE_CLIENT');
