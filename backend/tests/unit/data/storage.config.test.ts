import { loadStorageConfig } from '../../../data/object-storage-client/storage.config';

const REQUIRED = {
  S3_BUCKET: 'contrack-evidence',
  S3_ACCESS_KEY_ID: 'AKIA-contrack',
  S3_SECRET_ACCESS_KEY: 'contrack-secret',
};
describe('loadStorageConfig', () => {
  it('returns null when nothing is configured, so a developer runs without a bucket', () => {
    expect(loadStorageConfig({})).toBeNull();
  });
  it('defaults region, path-style addressing and upload URL TTL for AWS S3', () => {
    expect(loadStorageConfig(REQUIRED)).toEqual({
      endpoint: null,
      region: 'ap-southeast-1',
      bucket: 'contrack-evidence',
      accessKeyId: 'AKIA-contrack',
      secretAccessKey: 'contrack-secret',
      forcePathStyle: false,
      uploadUrlTtlSeconds: 300,
    });
  });
  it('reads an S3-compatible endpoint with path-style addressing — MinIO, R2, B2', () => {
    expect(
      loadStorageConfig({ ...REQUIRED, S3_ENDPOINT: 'http://minio:9000', S3_FORCE_PATH_STYLE: 'true' }),
    ).toMatchObject({ endpoint: 'http://minio:9000', forcePathStyle: true });
  });
  it('reads a region and a longer upload URL TTL', () => {
    expect(
      loadStorageConfig({ ...REQUIRED, S3_REGION: 'us-east-1', S3_UPLOAD_URL_TTL_SECONDS: '900' }),
    ).toMatchObject({ region: 'us-east-1', uploadUrlTtlSeconds: 900 });
  });
  it('rejects a partial configuration instead of silently ignoring it', () => {
    expect(() => loadStorageConfig({ S3_BUCKET: 'contrack-evidence' })).toThrow(/S3_ACCESS_KEY_ID/);
  });
  it('rejects a non-positive upload URL TTL', () => {
    expect(() => loadStorageConfig({ ...REQUIRED, S3_UPLOAD_URL_TTL_SECONDS: '0' })).toThrow(
      /S3_UPLOAD_URL_TTL_SECONDS/,
    );
  });
  it('rejects a path-style flag that is neither true nor false', () => {
    expect(() => loadStorageConfig({ ...REQUIRED, S3_FORCE_PATH_STYLE: 'yes' })).toThrow(
      /S3_FORCE_PATH_STYLE/,
    );
  });
  it('requires the storage variables when NODE_ENV=production — evidence has nowhere to go', () => {
    expect(() => loadStorageConfig({ NODE_ENV: 'production' })).toThrow(/S3_BUCKET/);
  });
});
