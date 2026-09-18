import { captureDomainErrorAsync } from '../../../support/domain-errors';
import { createTestDataSource } from '../../../support/pg-mem-data-source';
import { PlatformAdminRepository } from '../../../../repositories/platform/platform-admin.repository';
import { AccessRequirement } from '../../../../services/access-control/access.decorator';
import { PlatformCredentialResolver } from '../../../../services/access-control/platform-credential-resolver';
import { Operation, Resource } from '../../../../services/access-control/role-resolver';
import { TokenClaims } from '../../../../services/auth/token.service';
async function world() {
  const dataSource = await createTestDataSource();
  const [admin] =
    (await dataSource.query(`INSERT INTO platform_admins (name, username, password_hash) VALUES ('Ops Admin', 'ops.admin', 'hash')
     RETURNING id`)) as {
      id: number;
    }[];
  return {
    resolver: new PlatformCredentialResolver(new PlatformAdminRepository(dataSource)),
    adminId: admin.id,
  };
}
function claimsFor(sub: number): TokenClaims & {
  sub: number;
} {
  return { typ: 'platform', jti: 't', iat: 0, exp: Number.MAX_SAFE_INTEGER, sub };
}
describe('PlatformCredentialResolver', () => {
  it('loads the platform admin for a platform resource requirement', async () => {
    const { resolver, adminId } = await world();
    const access = await resolver.resolve(claimsFor(adminId), {
      resource: Resource.Tenants,
      operation: Operation.Read,
    });
    expect(access.platformAdmin.id).toBe(adminId);
  });
  it('refuses a desk resource — never reaches a grant table it has none for', async () => {
    const { resolver, adminId } = await world();
    const deskRequirement: AccessRequirement = { resource: Resource.Shifts, operation: Operation.Read };
    const error = await captureDomainErrorAsync(() => resolver.resolve(claimsFor(adminId), deskRequirement));
    expect(error.code).toBe('auth.forbidden_role');
  });
  it('refuses a subject with no matching platform_admins row', async () => {
    const { resolver, adminId } = await world();
    const error = await captureDomainErrorAsync(() =>
      resolver.resolve(claimsFor(adminId + 999), { resource: Resource.Tenants, operation: Operation.Read }),
    );
    expect(error.code).toBe('auth.credential_expired');
  });
  it('refuses a requirement-less route too — a platform token has no /auth/me-style free pass', async () => {
    const { resolver, adminId } = await world();
    const error = await captureDomainErrorAsync(() => resolver.resolve(claimsFor(adminId)));
    expect(error.code).toBe('auth.forbidden_role');
  });
  it('refuses claims missing sub (a malformed platform token)', async () => {
    const { resolver } = await world();
    const error = await captureDomainErrorAsync(() =>
      resolver.resolve(
        { typ: 'platform', jti: 't', iat: 0, exp: Number.MAX_SAFE_INTEGER },
        {
          resource: Resource.Tenants,
          operation: Operation.Read,
        },
      ),
    );
    expect(error.code).toBe('auth.credential_expired');
  });
});
