import { JwtService } from '@nestjs/jwt';
import { captureDomainError } from '../../support/domain-errors';
import { AuthConfig } from '../../../Services/AccessControl/auth.config';
import { FieldTokenService } from '../../../Services/field-token.service';

const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};

describe('FieldTokenService — D3', () => {
  let jwt: JwtService;
  let service: FieldTokenService;

  beforeEach(() => {
    jwt = new JwtService({ secret: config.jwtSecret });
    service = new FieldTokenService(jwt, config);
  });

  it('names one shift and expires after the configured lifetime', () => {
    const claims = service.verify(service.sign(42));

    expect(claims).toMatchObject({ typ: 'field', shift_id: 42 });
    expect(claims.exp - claims.iat).toBe(86400);
  });

  it('refuses a token signed by someone else', () => {
    const forged = new JwtService({ secret: 'another-secret' }).sign({ shift_id: 42, typ: 'field' });

    const error = captureDomainError(() => service.verify(forged));

    expect(error.code).toBe('token.invalid');
    expect(error.getStatus()).toBe(401);
  });

  it('refuses a string that is not a token at all', () => {
    const error = captureDomainError(() => service.verify('not-a-token'));

    expect(error.code).toBe('token.invalid');
  });

  it('refuses an expired token with a distinct code', () => {
    const expired = jwt.sign(
      { shift_id: 42, typ: 'field', jti: 'x', exp: Math.floor(Date.now() / 1000) - 60 },
      { noTimestamp: false },
    );

    const error = captureDomainError(() => service.verify(expired));

    expect(error.code).toBe('token.expired');
  });

  it('refuses an access-kind token presented as a field token', () => {
    const accessShaped = jwt.sign({ sub: 12, tenant_id: 4, role: 'director', typ: 'access' });

    const error = captureDomainError(() => service.verify(accessShaped));

    expect(error.code).toBe('token.invalid');
  });
});
