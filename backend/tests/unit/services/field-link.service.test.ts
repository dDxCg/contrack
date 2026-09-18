import { JwtService } from '@nestjs/jwt';
import { anAccessContext, anEmployee } from '../../support/builders';
import { FakeClock } from '../../support/clock';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Role } from '../../../models/employees/employee.entity';
import { AuthConfig } from '../../../services/access-control/auth.config';
import { InMemoryRevocationStore } from '../../../services/auth/revocation-store';
import { FieldLinkService } from '../../../services/field/field-link.service';
import { FieldTokenService } from '../../../services/field/field-token.service';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};
async function world() {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
  const fieldTokenService = new FieldTokenService(
    new JwtService({ secret: config.jwtSecret }),
    config,
    new InMemoryRevocationStore(new FakeClock()),
  );
  const clock = new FakeClock(new Date('2024-10-21T08:30:00.000Z'));
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);
  const shiftId = await seedShift(dataSource, {
    tenantId: tenant.id,
    contractItemId: chain.itemId,
    assigneeId: null,
    scheduledDate: '2024-10-21',
  });
  const director = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Director });
  return {
    shiftId,
    tenant,
    clock,
    fieldTokenService,
    access: anAccessContext(director, { tenantId: tenant.id }),
    service: new FieldLinkService(shifts, fieldTokenService, clock),
  };
}
describe('FieldLinkService.issue — D3', () => {
  it('issues a field token naming this shift, expiring after the configured lifetime', async () => {
    const { service, access, shiftId, clock, fieldTokenService } = await world();
    const link = await service.issue(access, shiftId);
    await expect(fieldTokenService.verify(link.token)).resolves.toMatchObject({ shift_id: shiftId });
    expect(link.url).toContain(link.token);
    expect(link.url).toContain('/field#');
    expect(link.expires_at).toBe(new Date(clock.now().getTime() + 86400 * 1000).toISOString());
  });
  it('answers 404 auth.out_of_scope for a shift outside the tenant', async () => {
    const { service, access } = await world();
    const error = await captureDomainErrorAsync(() => service.issue(access, 999999));
    expect(error.code).toBe('auth.out_of_scope');
  });
});
