import { JwtService } from '@nestjs/jwt';
import { FakeClock } from '../../support/clock';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { AuthConfig } from '../../../services/access-control/auth.config';
import { InMemoryRevocationStore } from '../../../services/auth/revocation-store';
import { FieldTokenService } from '../../../services/field/field-token.service';
import {
  FieldSubmissionCommand,
  FieldSubmissionService,
} from '../../../services/field/field-submission.service';
import { ShiftPhotoRepository } from '../../../repositories/shifts/shift-photo.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};
function validCommand(overrides: Partial<FieldSubmissionCommand> = {}): FieldSubmissionCommand {
  return {
    photoKeys: { before: ['uploads/x/before-1.jpg'], after: ['uploads/x/after-1.jpg'] },
    receiptPhotoKey: 'uploads/x/receipt.jpg',
    latitude: 21.0176,
    longitude: 105.7833,
    ...overrides,
  };
}
async function world(
  siteOverrides: {
    siteLatitude?: number | null;
    siteLongitude?: number | null;
    siteRadiusMeters?: number;
  } = {},
) {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
  const shiftPhotos = new ShiftPhotoRepository(dataSource);
  const tokens = new FieldTokenService(
    new JwtService({ secret: config.jwtSecret }),
    config,
    new InMemoryRevocationStore(new FakeClock()),
  );
  const clock = new FakeClock(new Date('2024-10-21T08:30:00.000Z'));
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id, siteOverrides);
  const shiftId = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: null,
    scheduledDate: '2024-10-21',
  });
  return {
    dataSource,
    shifts,
    shiftPhotos,
    tokens,
    clock,
    shiftId,
    tenant,
    service: new FieldSubmissionService(tokens, shifts, shiftPhotos, clock, dataSource),
  };
}
describe('FieldSubmissionService.submit — FR16, FR17, FR24', () => {
  it('completes the shift with server-stamped time and GPS', async () => {
    const { service, tokens, shiftId, shifts, tenant, clock } = await world();
    const view = await service.submit(tokens.sign(shiftId), validCommand());
    expect(view.status).toBe('completed');
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.capturedAt).toEqual(clock.now());
    expect(reloaded?.receiptPhotoUrl).toBe('uploads/x/receipt.jpg');
  });
  it('inserts a shift_photos row per submitted key', async () => {
    const { service, tokens, shiftId, dataSource } = await world();
    await service.submit(tokens.sign(shiftId), validCommand());
    const rows = (await dataSource.query('SELECT type_id FROM shift_photos WHERE shift_id = $1', [
      shiftId,
    ])) as {
      type_id: number;
    }[];
    expect(rows).toHaveLength(2);
  });
  it('completes with null GPS rather than rejecting the submission', async () => {
    const { service, tokens, shiftId } = await world();
    const view = await service.submit(
      tokens.sign(shiftId),
      validCommand({ latitude: null, longitude: null }),
    );
    expect(view.status).toBe('completed');
    expect(view.latitude).toBeNull();
    expect(view.longitude).toBeNull();
  });
  it('rejects a submission missing the before photo, naming the missing step', async () => {
    const { service, tokens, shiftId } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.submit(tokens.sign(shiftId), validCommand({ photoKeys: { before: [], after: ['x'] } })),
    );
    expect(error.code).toBe('shift.evidence_incomplete');
    expect(error.details).toEqual({ missing: ['before_photo'] });
  });
  it('rejects a submission missing the receipt photo', async () => {
    const { service, tokens, shiftId } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.submit(tokens.sign(shiftId), validCommand({ receiptPhotoKey: '' })),
    );
    expect(error.code).toBe('shift.evidence_incomplete');
    expect(error.details).toEqual({ missing: ['receipt_photo'] });
  });
  it('rejects a second submission for the same shift regardless of caller (D7)', async () => {
    const { service, tokens, shiftId } = await world();
    await service.submit(tokens.sign(shiftId), validCommand());
    const error = await captureDomainErrorAsync(() => service.submit(tokens.sign(shiftId), validCommand()));
    expect(error.code).toBe('shift.already_completed');
  });
  it('rejects reusing the exact same token for a second submission', async () => {
    const { service, tokens, shiftId } = await world();
    const raw = tokens.sign(shiftId);
    await service.submit(raw, validCommand());
    const error = await captureDomainErrorAsync(() => service.submit(raw, validCommand()));
    expect(error.code).toBe('token.already_used');
  });
  it('rejects an unknown shift id even with a well-formed token', async () => {
    const { service, tokens } = await world();
    const error = await captureDomainErrorAsync(() => service.submit(tokens.sign(999999), validCommand()));
    expect(error.code).toBe('token.invalid');
  });
  it('rejects an expired token', async () => {
    const { service, shiftId } = await world();
    const expiredTokens = new FieldTokenService(
      new JwtService({ secret: config.jwtSecret }),
      { ...config, fieldTtlSeconds: -1 },
      new InMemoryRevocationStore(new FakeClock()),
    );
    const error = await captureDomainErrorAsync(() =>
      service.submit(expiredTokens.sign(shiftId), validCommand()),
    );
    expect(error.code).toBe('token.expired');
  });
});
describe('FieldSubmissionService.submit — geofence (M3)', () => {
  it('marks geo_verified when the submitted coordinates fall within the site radius', async () => {
    const { service, tokens, shiftId, shifts, tenant } = await world({
      siteLatitude: 21.0176,
      siteLongitude: 105.7833,
      siteRadiusMeters: 200,
    });
    const view = await service.submit(
      tokens.sign(shiftId),
      validCommand({ latitude: 21.0177, longitude: 105.7834 }),
    );
    expect(view.geo_verified).toBe(true);
    const reloaded = await shifts.findById(tenant.id, shiftId);
    expect(reloaded?.geoVerified).toBe(true);
  });
  it('marks geo_verified false, but still accepts the submission, when outside the site radius', async () => {
    const { service, tokens, shiftId } = await world({
      siteLatitude: 21.0176,
      siteLongitude: 105.7833,
      siteRadiusMeters: 200,
    });
    const view = await service.submit(
      tokens.sign(shiftId),
      validCommand({ latitude: 10.762622, longitude: 106.660172 }),
    );
    expect(view.status).toBe('completed');
    expect(view.geo_verified).toBe(false);
  });
  it('marks geo_verified false when the site has no coordinates configured', async () => {
    const { service, tokens, shiftId } = await world();
    const view = await service.submit(tokens.sign(shiftId), validCommand());
    expect(view.geo_verified).toBe(false);
  });
  it('marks geo_verified false when the submission has no coordinates, even inside a configured site', async () => {
    const { service, tokens, shiftId } = await world({
      siteLatitude: 21.0176,
      siteLongitude: 105.7833,
      siteRadiusMeters: 200,
    });
    const view = await service.submit(
      tokens.sign(shiftId),
      validCommand({ latitude: null, longitude: null }),
    );
    expect(view.geo_verified).toBe(false);
  });
});
