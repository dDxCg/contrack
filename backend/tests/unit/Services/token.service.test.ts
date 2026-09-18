import { JwtService } from '@nestjs/jwt';
import { anEmployee } from '../../support/builders';
import { FakeClock } from '../../support/clock';
import { captureDomainError } from '../../support/domain-errors';
import { Role } from '../../../models/employees/employee.entity';
import { AuthConfig } from '../../../services/access-control/auth.config';
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
  let service: TokenService;
  beforeEach(() => {
    jwt = new JwtService({ secret: config.jwtSecret });
    clock = new FakeClock();
    service = new TokenService(jwt, config, clock);
  });
  describe('access tokens', () => {
    it('carries tenant, employee and role, and expires after the configured lifetime', () => {
      const employee = anEmployee({ id: 12, tenantId: 4, role: Role.Manager });
      const payload = service.verifyAccess(service.signAccess(employee));
      expect(payload).toMatchObject({ typ: 'access', sub: 12, tenant_id: 4, role: Role.Manager });
      expect(payload.exp - payload.iat).toBe(1800);
    });
    it('issues one refresh token per access token, for the longer lifetime', () => {
      const employee = anEmployee({ id: 12, tenantId: 4 });
      const payload = service.verifyRefresh(service.signRefresh(employee));
      expect(payload).toMatchObject({ typ: 'refresh', sub: 12, tenant_id: 4 });
      expect(payload.exp - payload.iat).toBe(43200);
    });
    it('refuses a token signed by someone else', () => {
      const forged = new JwtService({ secret: 'another-secret' }).sign({
        sub: 12,
        tenant_id: 4,
        role: Role.Director,
      });
      const error = captureDomainError(() => service.verifyAccess(forged));
      expect(error.code).toBe('auth.credential_expired');
      expect(error.getStatus()).toBe(401);
    });
    it('refuses a string that is not a token at all', () => {
      const error = captureDomainError(() => service.verifyAccess('not-a-token'));
      expect(error.code).toBe('auth.credential_expired');
    });
    it('refuses an expired token', () => {
      const expired = jwt.sign(
        { sub: 12, tenant_id: 4, role: Role.Director, typ: 'access', jti: 'expired', exp: futureEpoch(-60) },
        { noTimestamp: false },
      );
      const error = captureDomainError(() => service.verifyAccess(expired));
      expect(error.code).toBe('auth.credential_expired');
    });
    it('refuses a refresh token presented where an access token is expected', () => {
      const refresh = service.signRefresh(anEmployee());
      const error = captureDomainError(() => service.verifyAccess(refresh));
      expect(error.code).toBe('auth.credential_expired');
    });
    it('refuses an access token presented as a refresh token', () => {
      const access = service.signAccess(anEmployee());
      const error = captureDomainError(() => service.verifyRefresh(access));
      expect(error.code).toBe('auth.credential_expired');
    });
  });
  describe('revocation — logout invalidates the credential it was presented with', () => {
    it('refuses a credential whose jti has been revoked', () => {
      const employee = anEmployee();
      const token = service.signAccess(employee);
      service.revoke(service.verifyAccess(token));
      const error = captureDomainError(() => service.verifyAccess(token));
      expect(error.code).toBe('auth.credential_expired');
      expect(service.isRevoked(service.verifyRefresh(service.signRefresh(employee)).jti)).toBe(false);
    });
    it('refuses a revoked refresh token', () => {
      const refresh = service.signRefresh(anEmployee());
      service.revoke(service.verifyRefresh(refresh));
      expect(captureDomainError(() => service.verifyRefresh(refresh)).code).toBe('auth.credential_expired');
    });
    it('forgets a revocation once the credential would have expired anyway', () => {
      const alreadyExpired = {
        typ: 'access',
        jti: 'old',
        iat: Math.floor(clock.now().getTime() / 1000) - 61,
        exp: Math.floor(clock.now().getTime() / 1000) - 1,
      };
      service.revoke(alreadyExpired);
      expect(service.isRevoked('old')).toBe(false);
    });
    it('keeps a revocation until its own expiry passes', () => {
      service.revoke({
        typ: 'access',
        jti: 'current',
        iat: Math.floor(clock.now().getTime() / 1000),
        exp: Math.floor(clock.now().getTime() / 1000) + 60,
      });
      expect(service.isRevoked('current')).toBe(true);
      clock.advanceMs(61 * 1000);
      expect(service.isRevoked('current')).toBe(false);
    });
  });
  describe('published lifetimes', () => {
    it('tells the client how long its access token lasts', () => {
      expect(service.accessTtlSeconds).toBe(1800);
      expect(service.refreshTtlSeconds).toBe(43200);
    });
  });
  describe('platform tokens (M7) — no tenant_id at all, not a nullable one', () => {
    it('carries only sub, never a tenant_id claim', () => {
      const payload = service.verifyPlatform(service.signPlatform({ id: 7, name: 'Ops Admin' } as never));
      expect(payload).toMatchObject({ typ: 'platform', sub: 7 });
      expect(payload).not.toHaveProperty('tenant_id');
    });
    it('refuses an access token presented as a platform token', () => {
      const access = service.signAccess(anEmployee());
      expect(captureDomainError(() => service.verifyPlatform(access)).code).toBe('auth.credential_expired');
    });
  });
  describe('verifyAny — kind-agnostic, for AccessControlGuard to dispatch by typ (M2)', () => {
    it('returns the typ claim without asserting any credential-specific shape', () => {
      const employee = anEmployee({ id: 12, tenantId: 4 });
      const claims = service.verifyAny(service.signAccess(employee));
      expect(claims.typ).toBe('access');
    });
    it('still refuses a forged or expired token', () => {
      const forged = new JwtService({ secret: 'another-secret' }).sign({ typ: 'access' });
      expect(captureDomainError(() => service.verifyAny(forged)).code).toBe('auth.credential_expired');
    });
  });
});
function futureEpoch(offsetSeconds: number): number {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}
