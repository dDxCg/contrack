import { Injectable } from '@nestjs/common';
import { StorageUnavailableException } from '../../models/domain-errors';
import { DownloadTarget, ObjectStorageClient, UploadTarget } from './object-storage-client';

@Injectable()
export class NullObjectStorageClient implements ObjectStorageClient {
  async presignUpload(): Promise<UploadTarget> {
    throw new StorageUnavailableException();
  }

  async putObject(): Promise<{ key: string }> {
    throw new StorageUnavailableException();
  }

  async presignDownload(): Promise<DownloadTarget> {
    throw new StorageUnavailableException();
  }
}
