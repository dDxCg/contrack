import { JwtService } from '@nestjs/jwt';
import { FakeClock } from '../../support/clock';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import {
  ObjectStorageClient,
  PresignUploadInput,
  UploadTarget,
} from '../../../data/object-storage-client/object-storage-client';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { AuthConfig } from '../../../services/access-control/auth.config';
import { InMemoryRevocationStore } from '../../../services/auth/revocation-store';
import { FieldTokenService } from '../../../services/field/field-token.service';
import { FieldUploadService } from '../../../services/field/field-upload.service';
import { IUploadKeyFactory } from '../../../services/field/upload-key-factory';
const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};
class FakeObjectStorage implements ObjectStorageClient {
  readonly calls: PresignUploadInput[] = [];
  async presignUpload(input: PresignUploadInput): Promise<UploadTarget> {
    this.calls.push(input);
    return { uploadUrl: `https://storage.test/${input.key}?sig=fake`, key: input.key };
  }
}
class FixedUploadKeyFactory implements IUploadKeyFactory {
  next(): string {
    return '9f1c0d0e';
  }
}
async function world() {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
  const storage = new FakeObjectStorage();
  const tokens = new FieldTokenService(
    new JwtService({ secret: config.jwtSecret }),
    config,
    new InMemoryRevocationStore(new FakeClock()),
  );
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);
  const shiftId = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: null,
    scheduledDate: '2024-10-21',
  });
  return {
    service: new FieldUploadService(tokens, shifts, storage, new FixedUploadKeyFactory()),
    tokens,
    storage,
    tenant,
    shiftId,
  };
}
describe('FieldUploadService.issueTarget — photo upload', () => {
  it('issues a presigned target under a key scoped to the shift, and returns both', async () => {
    const { service, tokens, storage, tenant, shiftId } = await world();
    const target = await service.issueTarget(tokens.sign(shiftId), 'image/jpeg');
    const key = `uploads/${tenant.id}/${shiftId}/9f1c0d0e.jpg`;
    expect(target).toEqual({ upload_url: `https://storage.test/${key}?sig=fake`, key });
    expect(storage.calls).toEqual([{ key, contentType: 'image/jpeg' }]);
  });
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('maps %s to a .%s key', async (contentType, extension) => {
    const { service, tokens, storage, shiftId } = await world();
    await service.issueTarget(tokens.sign(shiftId), contentType);
    expect(storage.calls[0].key.endsWith(`.${extension}`)).toBe(true);
  });
  it('rejects a content type that is not a photo, before touching storage', async () => {
    const { service, tokens, storage, shiftId } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.issueTarget(tokens.sign(shiftId), 'application/pdf'),
    );
    expect(error.code).toBe('upload.unsupported_type');
    expect(error.details).toEqual({ content_type: 'application/pdf' });
    expect(storage.calls).toEqual([]);
  });
  it('rejects a well-formed token for a shift that does not exist', async () => {
    const { service, tokens, storage } = await world();
    const error = await captureDomainErrorAsync(() => service.issueTarget(tokens.sign(999999), 'image/jpeg'));
    expect(error.code).toBe('token.invalid');
    expect(storage.calls).toEqual([]);
  });
  it('rejects an expired token', async () => {
    const { service, storage, shiftId } = await world();
    const expiredTokens = new FieldTokenService(
      new JwtService({ secret: config.jwtSecret }),
      { ...config, fieldTtlSeconds: -1 },
      new InMemoryRevocationStore(new FakeClock()),
    );
    const error = await captureDomainErrorAsync(() =>
      service.issueTarget(expiredTokens.sign(shiftId), 'image/jpeg'),
    );
    expect(error.code).toBe('token.expired');
    expect(storage.calls).toEqual([]);
  });
});
