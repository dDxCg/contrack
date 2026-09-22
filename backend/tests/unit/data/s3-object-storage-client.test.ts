import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3ObjectStorageClient } from '../../../data/object-storage-client/s3-object-storage-client';
import { StorageConfig } from '../../../data/object-storage-client/storage.config';

const config: StorageConfig = {
  endpoint: null,
  region: 'ap-southeast-1',
  bucket: 'contrack-evidence',
  accessKeyId: 'AKIA-contrack',
  secretAccessKey: 'contrack-secret',
  forcePathStyle: false,
  uploadUrlTtlSeconds: 300,
};

describe('S3ObjectStorageClient', () => {
  it('signs a browser PUT for the bucket, key and TTL it was configured with', async () => {
    const target = await new S3ObjectStorageClient(config).presignUpload({
      key: 'uploads/1/2/photo.jpg',
      contentType: 'image/jpeg',
    });
    expect(target.key).toBe('uploads/1/2/photo.jpg');
    const url = new URL(target.uploadUrl);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('contrack-evidence.s3.ap-southeast-1.amazonaws.com');
    expect(url.pathname).toBe('/uploads/1/2/photo.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('honours a path-style S3-compatible endpoint — MinIO, R2, B2', async () => {
    const target = await new S3ObjectStorageClient({
      ...config,
      endpoint: 'http://minio:9000',
      forcePathStyle: true,
    }).presignUpload({ key: 'uploads/1/2/photo.png', contentType: 'image/png' });
    const url = new URL(target.uploadUrl);
    expect(url.origin).toBe('http://minio:9000');
    expect(url.pathname).toBe('/contrack-evidence/uploads/1/2/photo.png');
  });

  it('writes bytes to the bucket with the given key and content type', async () => {
    const client = new S3ObjectStorageClient(config);
    const send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({ $metadata: {} } as never);
    const body = Buffer.from('%PDF-1.3 fake pdf bytes');

    const result = await client.putObject({
      key: 'statements/1/7.pdf',
      contentType: 'application/pdf',
      body,
    });

    expect(result).toEqual({ key: 'statements/1/7.pdf' });
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'contrack-evidence',
      Key: 'statements/1/7.pdf',
      Body: body,
      ContentType: 'application/pdf',
    });
    send.mockRestore();
  });

  it('signs a GET for reading back an object it wrote, honouring the same TTL as uploads', async () => {
    const target = await new S3ObjectStorageClient(config).presignDownload({ key: 'statements/1/7.pdf' });
    const url = new URL(target.url);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('contrack-evidence.s3.ap-southeast-1.amazonaws.com');
    expect(url.pathname).toBe('/statements/1/7.pdf');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });
});
