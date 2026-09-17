import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import { AccessContext } from './access-context';
import { Operation, Resource } from './role-resolver';

export const ACCESS_METADATA = 'access';
export const PUBLIC_METADATA = 'public';

export interface AccessRequirement {
  readonly resource: Resource;
  readonly operation: Operation;
}

export const Access = (resource: Resource, operation: Operation): MethodDecorator =>
  SetMetadata(ACCESS_METADATA, { resource, operation } satisfies AccessRequirement);

export const Public = (): MethodDecorator => SetMetadata(PUBLIC_METADATA, true);

interface RequestWithAccess {
  access?: AccessContext;
}

export const CurrentAccess = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessContext => {
    const request = context.switchToHttp().getRequest<RequestWithAccess>();
    if (request.access === undefined) {
      throw new Error('No AccessContext on the request — is AccessControlGuard registered?');
    }

    return request.access;
  },
);
