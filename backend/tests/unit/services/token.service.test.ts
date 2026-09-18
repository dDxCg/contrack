import { JwtService } from '@nestjs/jwt';
import { anEmployee } from '../../support/builders';
import { FakeClock } from '../../support/clock';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { Role } from '../../../models/employees/employee.entity';
import { AuthConfig } from '../../../services/access-control/auth.config';
import { InMemoryRevocationStore } from '../../../services/auth/revocation-store';
import { TokenService } from '../../../services/auth/token.service';
const config: AuthConfig = {
  jwtSecret: 'test-secret',
  accessTtlSeconds: 1800,
  refreshTtlSeconds: 43200,
  fieldTtlSeconds: 86400,
  bcryptRounds: 4,
};
describe('TokenService', () => {
  let jwt: JwtService;
  let clock: FakeClock;
  let revocations: InMemoryRevocationStore;
  let service: TokenService;
  beforeEach(() => {
    jwt = new JwtService({ secret: config.jwtSecret });
    clock = new FakeClock();
    revocations = new InMemoryRevocationStore(clock);
    service = new TokenService(jwt, config, revocations);
  });
  describe('access tokens', () => {
    it('carries tenant, employee and role, and expires after the configured lifetime', async () => {
      const employee = anEmployee({ id: 12, tenantId: 4, role: Role.Manager });
      const payload = await service.verifyAccess(service.signAccess(employee));
      expect(payload).toMatchObject({ typ: 'access', sub: 12, tenant_id: 4, role: Role.Manager });
      expect(payload.exp - payload.iat).toBe(1800);
    });
    it('issues one refresh token per access token, for the longer lifetime', async () => {
      const employee = anEmployee({ id: 12, tenantId: 4 });
      const payload = await service.verifyRefresh(service.signRefresh(employee));
      expect(payload).toMatchObject({ typ: 'refresh', sub: 12, tenant_id: 4 });
      expect(payload.exp - payload.iat).toBe(43200);
    });
    it('refuses a token signed by someone else', async () => {
      const forged = new JwtService({ secret: 'another-secret' }).sign({
        sub: 12,
        tenant_id: 4,
        role: Role.Director,
      });
      const error = await captureDomainErrorAsync(() => service.verifyAccess(forged));
      expect(error.code).toBe('auth.credential_expired');
      expect(error.getStatus()).toBe(401);
    });
    it('refuses a string that is not a token at all', async () => {
      const error = await captureDomainErrorAsync(() => service.verifyAccess('not-a-token'));
      expect(error.code).toBe('auth.credential_expired');
    });
    it('refuses an expired token', async () => {
      const expired = jwt.sign(
        { sub: 12, tenant_id: 4, role: Role.Director, typ: 'access', jti: 'expired', exp: futureEpoch(-60) },
        { noTimestamp: false },
      );
      const error = await captureDomainErrorAsync(() => service.verifyAccess(expired));
      expect(error.code).toBe('auth.credential_expired');
    });
    it('refuses a refresh token presented where an access token is expected', async () => {
      const refresh = service.signRefresh(anEmployee());
      const error = await captureDomainErrorAsync(() => service.verifyAccess(refresh));
      expect(error.code).toBe('auth.credential_expired');
    });
    it('refuses an access token presented as a refresh token', async () => {
      const access = service.signAccess(anEmployee());
      const error = await captureDomainErrorAsync(() => service.verifyRefresh(access));
      expect(error.code).toBe('auth.credential_expired');
    });
  });
  describe('revocation — logout invalidates the credential it was presented with', () => {
    it('refuses a credential whose jti has been revoked', async () => {
      const employee = anEmployee();
      const token = service.signAccess(employee);
      await service.revoke(await service.verifyAccess(token));
      const error = await captureDomainErrorAsync(() => service.verifyAccess(token));
      expect(error.code).toBe('auth.credential_expired');
      const otherRefresh = await service.verifyRefresh(service.signRefresh(employee));
      expect(await service.isRevoked(otherRefresh.jti)).toBe(false);
    });
    it('refuses a revoked refresh token', async () => {
      const refresh = service.signRefresh(anEmployee());
      await service.revoke(await service.verifyRefresh(refresh));
      expect((await captureDomainErrorAsync(() => service.verifyRefresh(refresh))).code).toBe(
        'auth.credential_expired',
      );
    });
    it('forgets a revocation once the credential would have expired anyway', async () => {
      const alreadyExpired = {
        typ: 'access',
        jti: 'old',
        iat: Math.floor(clock.now().getTime() / 1000) - 61,
        exp: Math.floor(clock.now().getTime() / 1000) - 1,
      };
      await service.revoke(alreadyExpired);
      expect(await service.isRevoked('old')).toBe(false);
    });
    it('keeps a revocation until its own expiry passes', async () => {
      await service.revoke({
        typ: 'access',
        jti: 'current',
        iat: Math.floor(clock.now().getTime() / 1000),
        exp: Math.floor(clock.now().getTime() / 1000) + 60,
      });
      expect(await service.isRevoked('current')).toBe(true);
      clock.advanceMs(61 * 1000);
      expect(await service.isRevoked('current')).toBe(false);
    });
  });
  describe('published lifetimes', () => {
    it('tells the client how long its access token lasts', () => {
      expect(service.accessTtlSeconds).toBe(1800);
      expect(service.refreshTtlSeconds).toBe(43200);
    });
  });
  describe('platform tokens (M7) — no tenant_id at all, not a nullable one', () => {
    it('carries only sub, never a tenant_id claim', async () => {
      const payload = await service.verifyPlatform(
        service.signPlatform({ id: 7, name: 'Ops Admin' } as never),
      );
      expect(payload).toMatchObject({ typ: 'platform', sub: 7 });
      expect(payload).not.toHaveProperty('tenant_id');
    });
    it('refuses an access token presented as a platform token', async () => {
      const access = service.signAccess(anEmployee());
      expect((await captureDomainErrorAsync(() => service.verifyPlatform(access))).code).toBe(
        'auth.credential_expired',
      );
    });
  });
  describe('verifyAny — kind-agnostic, for AccessControlGuard to dispatch by typ (M2)', () => {
    it('returns the typ claim without asserting any credential-specific shape', async () => {
      const employee = anEmployee({ id: 12, tenantId: 4 });
      const claims = await service.verifyAny(service.signAccess(employee));
      expect(claims.typ).toBe('access');
    });
    it('still refuses a forged or expired token', async () => {
      const forged = new JwtService({ secret: 'another-secret' }).sign({ typ: 'access' });
      expect((await captureDomainErrorAsync(() => service.verifyAny(forged))).code).toBe(
        'auth.credential_expired',
      );
    });
  });
});
function futureEpoch(offsetSeconds: number): number {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}
