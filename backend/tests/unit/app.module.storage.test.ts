import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { OBJECT_STORAGE_CLIENT } from '../../data/object-storage-client/object-storage-client';
import { NullObjectStorageClient } from '../../data/object-storage-client/null-object-storage-client';
import { S3ObjectStorageClient } from '../../data/object-storage-client/s3-object-storage-client';
const MANAGED_VARIABLES = ['JWT_SECRET', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;
async function storageClientFor(config: Partial<Record<string, string>>): Promise<unknown> {
  const applied: Record<string, string | undefined> = {};
  for (const name of MANAGED_VARIABLES) {
    applied[name] = process.env[name];
    delete process.env[name];
  }
  Object.assign(process.env, { JWT_SECRET: 'test-secret', ...config });
  try {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const client = moduleRef.get(OBJECT_STORAGE_CLIENT);
    await moduleRef.close();
    return client;
  } finally {
    for (const name of MANAGED_VARIABLES) {
      const value = applied[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}
describe('AppModule — storage implementation comes from the environment', () => {
  it('wires the null client while no bucket is configured', async () => {
    expect(await storageClientFor({})).toBeInstanceOf(NullObjectStorageClient);
  });
  it('wires the S3 client as soon as the bucket variables appear — no code change', async () => {
    const client = await storageClientFor({
      S3_BUCKET: 'contrack-evidence',
      S3_ACCESS_KEY_ID: 'AKIA-contrack',
      S3_SECRET_ACCESS_KEY: 'contrack-secret',
    });
    expect(client).toBeInstanceOf(S3ObjectStorageClient);
  });
});
