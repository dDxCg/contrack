import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import { AuthCredentialExpiredException } from '../../models/domain-errors';
import { AccessContext } from './access-context';
import { PlatformAccessContext } from './platform-access-context';
import { Operation, Resource } from './role-resolver';

export const ACCESS_METADATA = 'access';

export const PUBLIC_METADATA = 'public';

export const SELF_SCOPED_METADATA = 'self_scoped';

export interface AccessRequirement {
  readonly resource: Resource;
  readonly operation: Operation;
}

export const Access = (resource: Resource, operation: Operation): MethodDecorator =>
  SetMetadata(ACCESS_METADATA, { resource, operation } satisfies AccessRequirement);

export const Public = (): MethodDecorator => SetMetadata(PUBLIC_METADATA, true);

export const SelfScoped = (): MethodDecorator => SetMetadata(SELF_SCOPED_METADATA, true);

interface RequestWithAccess {
  access?: AccessContext | PlatformAccessContext;
}

export const CurrentAccess = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessContext => {
    const request = context.switchToHttp().getRequest<RequestWithAccess>();

    if (request.access === undefined) {
      throw new Error('No AccessContext on the request — is AccessControlGuard registered?');
    }

    if (!('employee' in request.access)) {
      throw new AuthCredentialExpiredException();
    }

    return request.access;
  },
);

export const CurrentPlatformAccess = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlatformAccessContext => {
    const request = context.switchToHttp().getRequest<RequestWithAccess>();

    if (request.access === undefined) {
      throw new Error('No AccessContext on the request — is AccessControlGuard registered?');
    }

    if (!('platformAdmin' in request.access)) {
      throw new AuthCredentialExpiredException();
    }

    return request.access;
  },
);
