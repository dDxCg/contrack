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
});
