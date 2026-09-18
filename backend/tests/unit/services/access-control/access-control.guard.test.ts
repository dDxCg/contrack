import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { captureDomainErrorAsync } from '../../../support/domain-errors';
import { AccessControlGuard } from '../../../../services/access-control/access-control.guard';
import { AccessRequirement } from '../../../../services/access-control/access.decorator';
import { CredentialResolver } from '../../../../services/access-control/credential-resolver';
import { TokenClaims } from '../../../../services/auth/token.service';
function fakeResolver(kind: string, access: unknown = { resolved: kind }): CredentialResolver {
  return { kind, resolve: jest.fn().mockResolvedValue(access) };
}
function contextFor(
  headers: Record<string, string | undefined>,
  metadata: {
    public?: boolean;
    access?: AccessRequirement;
    selfScoped?: boolean;
  } = {},
): {
  context: ExecutionContext;
  request: {
    headers: typeof headers;
    access?: unknown;
  };
} {
  const request: {
    headers: typeof headers;
    access?: unknown;
  } = { headers };
  const handler = (): void => undefined;
  class Controller {}
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Controller,
  } as unknown as ExecutionContext;
  jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation((key: unknown) => {
    if (key === 'public') return metadata.public === true;
    if (key === 'access') return metadata.access;
    if (key === 'self_scoped') return metadata.selfScoped === true;
    return undefined;
  });
  return { context, request };
}
function verifyAnyReturning(claims: TokenClaims): {
  verifyAny: jest.Mock;
} {
  return { verifyAny: jest.fn().mockReturnValue(claims) };
}
describe('AccessControlGuard', () => {
  afterEach(() => jest.restoreAllMocks());
  it('bypasses everything for a @Public() route', async () => {
    const guard = new AccessControlGuard(new Reflector(), verifyAnyReturning(null as never) as never, []);
    const { context } = contextFor({}, { public: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
  it('rejects a missing or malformed Authorization header before verifying anything', async () => {
    const guard = new AccessControlGuard(new Reflector(), verifyAnyReturning(null as never) as never, []);
    const { context } = contextFor({ authorization: 'not-bearer' });
    const error = await captureDomainErrorAsync(() => guard.canActivate(context));
    expect(error.code).toBe('auth.credential_expired');
  });
  it('rejects a signature-valid token whose typ matches no registered resolver — fails closed, not 500', async () => {
    const tokenService = verifyAnyReturning({ typ: 'unknown-kind', jti: 't', iat: 0, exp: 1 });
    const guard = new AccessControlGuard(new Reflector(), tokenService as never, [fakeResolver('access')]);
    const { context } = contextFor({ authorization: 'Bearer token' });
    const error = await captureDomainErrorAsync(() => guard.canActivate(context));
    expect(error.code).toBe('auth.credential_expired');
  });
  it('dispatches to the resolver whose kind matches the token typ, and stores its result on the request', async () => {
    const claims: TokenClaims = { typ: 'access', jti: 't', iat: 0, exp: 1 };
    const tokenService = verifyAnyReturning(claims);
    const desk = fakeResolver('access', { resolved: 'desk' });
    const platform = fakeResolver('platform', { resolved: 'platform' });
    const guard = new AccessControlGuard(new Reflector(), tokenService as never, [desk, platform]);
    const requirement: AccessRequirement = { resource: 'customers' as never, operation: 'read' as never };
    const { context, request } = contextFor({ authorization: 'Bearer token' }, { access: requirement });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(desk.resolve).toHaveBeenCalledWith(claims, requirement);
    expect(platform.resolve).not.toHaveBeenCalled();
    expect(request.access).toEqual({ resolved: 'desk' });
  });
  it('fails closed when a handler carries neither @Access nor @SelfScoped — a forgotten decorator, not an open route', async () => {
    const claims: TokenClaims = { typ: 'access', jti: 't', iat: 0, exp: 1 };
    const tokenService = verifyAnyReturning(claims);
    const desk = fakeResolver('access');
    const guard = new AccessControlGuard(new Reflector(), tokenService as never, [desk]);
    const { context } = contextFor({ authorization: 'Bearer token' });
    const error = await captureDomainErrorAsync(() => guard.canActivate(context));
    expect(error.code).toBe('auth.forbidden_role');
    expect(desk.resolve).not.toHaveBeenCalled();
  });
  it('lets a @SelfScoped handler through with no @Access metadata', async () => {
    const claims: TokenClaims = { typ: 'access', jti: 't', iat: 0, exp: 1 };
    const tokenService = verifyAnyReturning(claims);
    const desk = fakeResolver('access', { resolved: 'desk' });
    const guard = new AccessControlGuard(new Reflector(), tokenService as never, [desk]);
    const { context } = contextFor({ authorization: 'Bearer token' }, { selfScoped: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(desk.resolve).toHaveBeenCalledWith(claims, undefined);
  });
});
