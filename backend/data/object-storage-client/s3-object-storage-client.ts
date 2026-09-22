import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  DownloadTarget,
  ObjectStorageClient,
  PresignDownloadInput,
  PresignUploadInput,
  PutObjectInput,
  UploadTarget,
} from './object-storage-client';
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

  async putObject(input: PutObjectInput): Promise<{ key: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return { key: input.key };
  }

  async presignDownload(input: PresignDownloadInput): Promise<DownloadTarget> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
      }),
      { expiresIn: this.config.uploadUrlTtlSeconds },
    );

    return { url };
  }
}
