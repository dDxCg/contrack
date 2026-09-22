import { NullObjectStorageClient } from '../../../data/object-storage-client/null-object-storage-client';
import { ObjectStorageClient } from '../../../data/object-storage-client/object-storage-client';
import { captureDomainErrorAsync } from '../../support/domain-errors';

describe('NullObjectStorageClient', () => {
  it('fails loudly instead of handing out a key no bucket will ever accept', async () => {
    const storage: ObjectStorageClient = new NullObjectStorageClient();
    const error = await captureDomainErrorAsync(() =>
      storage.presignUpload({ key: 'uploads/1/2/photo.jpg', contentType: 'image/jpeg' }),
    );
    expect(error.code).toBe('storage.unavailable');
  });

  it('fails loudly on a direct server-side put instead of pretending it wrote the bytes', async () => {
    const storage: ObjectStorageClient = new NullObjectStorageClient();
    const error = await captureDomainErrorAsync(() =>
      storage.putObject({
        key: 'statements/1/7.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('x'),
      }),
    );
    expect(error.code).toBe('storage.unavailable');
  });

  it('fails loudly on a download presign instead of handing out a dead link', async () => {
    const storage: ObjectStorageClient = new NullObjectStorageClient();
    const error = await captureDomainErrorAsync(() => storage.presignDownload({ key: 'statements/1/7.pdf' }));
    expect(error.code).toBe('storage.unavailable');
  });
});
