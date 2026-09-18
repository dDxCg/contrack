import { JwtService } from '@nestjs/jwt';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { FakeClock } from '../../support/clock';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { AuthConfig } from '../../../services/access-control/auth.config';
import { PlatformAdminRepository } from '../../../repositories/platform/platform-admin.repository';
import { BcryptPasswordHasher } from '../../../services/auth/password-hasher.service';
import { PlatformAuthService } from '../../../services/platform/platform-auth.service';
import { TokenService } from '../../../services/auth/token.service';
const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};
async function world() {
  const dataSource = await createTestDataSource();
  const repository = new PlatformAdminRepository(dataSource);
  const hasher = new BcryptPasswordHasher(config.bcryptRounds);
  const tokenService = new TokenService(
    new JwtService({ secret: config.jwtSecret }),
    config,
    new FakeClock(),
  );
  const service = new PlatformAuthService(repository, tokenService, hasher);
  await dataSource.query(
    `INSERT INTO platform_admins (name, username, password_hash) VALUES ('Ops Admin', 'ops.admin', $1)`,
    [await hasher.hash('correct-password')],
  );
  return { service, tokenService };
}
describe('PlatformAuthService.login', () => {
  it('exchanges valid credentials for a platform token carrying no tenant_id', async () => {
    const { service, tokenService } = await world();
    const session = await service.login({ username: 'ops.admin', password: 'correct-password' });
    expect(session.platform_admin).toMatchObject({ name: 'Ops Admin' });
    expect(tokenService.verifyPlatform(session.token).sub).toBe(session.platform_admin.id);
  });
  it('rejects an unknown username', async () => {
    const { service } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.login({ username: 'nobody', password: 'correct-password' }),
    );
    expect(error.code).toBe('auth.invalid_credentials');
  });
  it('rejects the wrong password', async () => {
    const { service } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.login({ username: 'ops.admin', password: 'wrong-password' }),
    );
    expect(error.code).toBe('auth.invalid_credentials');
  });
});
