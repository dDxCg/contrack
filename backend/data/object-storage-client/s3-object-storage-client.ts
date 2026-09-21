import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ObjectStorageClient, PresignUploadInput, UploadTarget } from './object-storage-client';
import { StorageConfig } from './storage.config';
@Injectable()
export class S3ObjectStorageClient implements ObjectStorageClient {
  private readonly client: S3Client;
  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint ?? undefined,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  async presignUpload(input: PresignUploadInput): Promise<UploadTarget> {
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        ContentType: input.contentType,
      }),
      { expiresIn: this.config.uploadUrlTtlSeconds },
    );
    return { uploadUrl, key: input.key };
  }
}
