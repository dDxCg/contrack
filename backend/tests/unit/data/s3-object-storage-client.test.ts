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
});
