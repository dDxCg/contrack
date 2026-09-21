import { Injectable } from '@nestjs/common';
import { StorageUnavailableException } from '../../models/domain-errors';
import { ObjectStorageClient, UploadTarget } from './object-storage-client';
@Injectable()
export class NullObjectStorageClient implements ObjectStorageClient {
  async presignUpload(): Promise<UploadTarget> {
    throw new StorageUnavailableException();
  }
}
