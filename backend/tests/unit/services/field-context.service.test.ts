import { JwtService } from '@nestjs/jwt';
import { FakeClock } from '../../support/clock';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { AuthConfig } from '../../../services/access-control/auth.config';
import { InMemoryRevocationStore } from '../../../services/auth/revocation-store';
import { FieldContextService } from '../../../services/field/field-context.service';
import { FieldTokenService } from '../../../services/field/field-token.service';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};
async function world(shiftOverrides: { status?: string } = {}) {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
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
    ...shiftOverrides,
  });
  return {
    dataSource,
    shifts,
    tokens,
    shiftId,
    tenant,
    token: tokens.sign(shiftId),
    service: new FieldContextService(tokens, shifts),
  };
}
describe('FieldContextService.get', () => {
  it('returns the site, item and full remaining steps for an unsubmitted shift', async () => {
    const { service, token } = await world();
    const context = await service.get(token);
    expect(context).toMatchObject({
      contract_site: 'Seed Site',
      service_item: 'Seed Item',
      remaining_steps: ['before_photo', 'after_photo', 'receipt_photo'],
    });
    expect(context.scheduled_at).toBeTruthy();
  });
  it('returns no remaining steps once the shift is completed', async () => {
    const { service, token } = await world({ status: 'completed' });
    const context = await service.get(token);
    expect(context.remaining_steps).toEqual([]);
  });
  it('rejects an expired token', async () => {
    const { service } = await world();
    const jwt = new JwtService({ secret: config.jwtSecret });
    const expired = jwt.sign(
      { shift_id: 1, typ: 'field', jti: 'x', exp: Math.floor(Date.now() / 1000) - 60 },
      { noTimestamp: false },
    );
    const error = await captureDomainErrorAsync(() => service.get(expired));
    expect(error.code).toBe('token.expired');
  });
  it('rejects a garbage token', async () => {
    const { service } = await world();
    const error = await captureDomainErrorAsync(() => service.get('not-a-real-token'));
    expect(error.code).toBe('token.invalid');
  });
});
