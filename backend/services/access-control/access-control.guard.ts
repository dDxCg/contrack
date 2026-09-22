import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthCredentialExpiredException, AuthForbiddenRoleException } from '../../models/domain-errors';
import { TokenService } from '../auth/token.service';
import { AccessContext } from './access-context';
import {
  ACCESS_METADATA,
  AccessRequirement,
  PUBLIC_METADATA,
  SELF_SCOPED_METADATA,
} from './access.decorator';
import { CREDENTIAL_RESOLVERS, CredentialResolver } from './credential-resolver';
import { PlatformAccessContext } from './platform-access-context';

interface DeskRequest {
  headers: Record<string, string | string[] | undefined>;
  access?: AccessContext | PlatformAccessContext;
}

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    @Inject(CREDENTIAL_RESOLVERS)
    private readonly resolvers: readonly CredentialResolver[],
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<DeskRequest>();
    const claims = await this.tokenService.verifyAny(this.bearerToken(request));
    const resolver = this.resolvers.find((candidate) => candidate.kind === claims.typ);

    if (resolver === undefined) {
      throw new AuthCredentialExpiredException();
    }

    const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(ACCESS_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requirement === undefined && !this.isSelfScoped(context)) {
      throw new AuthForbiddenRoleException([]);
    }

    request.access = await resolver.resolve(claims, requirement);

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private isSelfScoped(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(SELF_SCOPED_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private bearerToken(request: DeskRequest): string {
    const header = request.headers.authorization;
    const [scheme, token] = (Array.isArray(header) ? header[0] : header)?.split(' ') ?? [];

    if (scheme?.toLowerCase() !== 'bearer' || token === undefined || token === '') {
      throw new AuthCredentialExpiredException();
    }

    return token;
  }
}
