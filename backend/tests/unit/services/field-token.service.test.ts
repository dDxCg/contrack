import { JwtService } from '@nestjs/jwt';
import { FakeClock } from '../../support/clock';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { AuthConfig } from '../../../services/access-control/auth.config';
import { InMemoryRevocationStore } from '../../../services/auth/revocation-store';
import { FieldTokenService } from '../../../services/field/field-token.service';

const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};
describe('FieldTokenService — D3', () => {
  let jwt: JwtService;
  let revocations: InMemoryRevocationStore;
  let service: FieldTokenService;
  beforeEach(() => {
    jwt = new JwtService({ secret: config.jwtSecret });
    revocations = new InMemoryRevocationStore(new FakeClock());
    service = new FieldTokenService(jwt, config, revocations);
  });
  it('names one shift and expires after the configured lifetime', async () => {
    const claims = await service.verify(service.sign(42));
    expect(claims).toMatchObject({ typ: 'field', shift_id: 42 });
    expect(claims.exp - claims.iat).toBe(86400);
  });
  it('refuses a token signed by someone else', async () => {
    const forged = new JwtService({ secret: 'another-secret' }).sign({ shift_id: 42, typ: 'field' });
    const error = await captureDomainErrorAsync(() => service.verify(forged));
    expect(error.code).toBe('token.invalid');
    expect(error.getStatus()).toBe(401);
  });
  it('refuses a string that is not a token at all', async () => {
    const error = await captureDomainErrorAsync(() => service.verify('not-a-token'));
    expect(error.code).toBe('token.invalid');
  });
  it('refuses an expired token with a distinct code', async () => {
    const expired = jwt.sign(
      { shift_id: 42, typ: 'field', jti: 'x', exp: Math.floor(Date.now() / 1000) - 60 },
      { noTimestamp: false },
    );
    const error = await captureDomainErrorAsync(() => service.verify(expired));
    expect(error.code).toBe('token.expired');
  });
  it('refuses an access-kind token presented as a field token', async () => {
    const accessShaped = jwt.sign({ sub: 12, tenant_id: 4, role: 'director', typ: 'access' });
    const error = await captureDomainErrorAsync(() => service.verify(accessShaped));
    expect(error.code).toBe('token.invalid');
  });
  it('refuses a token already marked used — the link is single-use', async () => {
    const raw = service.sign(42);
    const claims = await service.verify(raw);
    await service.markUsed(claims);
    const error = await captureDomainErrorAsync(() => service.verify(raw));
    expect(error.code).toBe('token.already_used');
    expect(error.getStatus()).toBe(401);
  });
});
