import { JwtService } from '@nestjs/jwt';
import { FakeClock } from '../../support/clock';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { AuthConfig } from '../../../Services/AccessControl/auth.config';
import { FieldTokenService } from '../../../Services/field-token.service';
import { FieldSubmissionCommand, FieldSubmissionService } from '../../../Services/field-submission.service';
import { ShiftPhotoRepository } from '../../../Repositories/shift-photo.repository';
import { ShiftRepository } from '../../../Repositories/shift.repository';

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

async function world() {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
  const shiftPhotos = new ShiftPhotoRepository(dataSource);
  const tokens = new FieldTokenService(new JwtService({ secret: config.jwtSecret }), config);
  const clock = new FakeClock(new Date('2024-10-21T08:30:00.000Z'));

  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);
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
    service: new FieldSubmissionService(tokens, shifts, shiftPhotos, clock),
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
    ])) as { type_id: number }[];
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

  it('rejects an unknown shift id even with a well-formed token', async () => {
    const { service, tokens } = await world();

    const error = await captureDomainErrorAsync(() => service.submit(tokens.sign(999_999), validCommand()));

    expect(error.code).toBe('token.invalid');
  });

  it('rejects an expired token', async () => {
    const { service, shiftId } = await world();
    const expiredTokens = new FieldTokenService(new JwtService({ secret: config.jwtSecret }), {
      ...config,
      fieldTtlSeconds: -1,
    });

    const error = await captureDomainErrorAsync(() =>
      service.submit(expiredTokens.sign(shiftId), validCommand()),
    );

    expect(error.code).toBe('token.expired');
  });
});
