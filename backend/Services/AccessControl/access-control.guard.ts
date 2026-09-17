import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthCredentialExpiredException } from '../../Models/domain-errors';
import { EmployeeRepository } from '../../Repositories/employee.repository';
import { TokenService } from '../token.service';
import { AccessContext } from './access-context';
import { ACCESS_METADATA, AccessRequirement, PUBLIC_METADATA } from './access.decorator';
import { RoleResolver } from './role-resolver';
import { RowScope } from './row-scope';
import { ScopeResolver } from './scope-resolver';
import { TenantResolver } from './tenant-resolver';

interface DeskRequest {
  headers: Record<string, string | string[] | undefined>;
  access?: AccessContext;
}

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly employeeRepository: EmployeeRepository,
    private readonly tenantResolver: TenantResolver,
    private readonly roleResolver: RoleResolver,
    private readonly scopeResolver: ScopeResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<DeskRequest>();
    const credential = this.tokenService.verifyAccess(this.bearerToken(request));
    const tenantId = this.tenantResolver.fromCredential(credential);
    const employee = await this.employeeRepository.findById(tenantId, credential.sub);

    if (employee === null || !employee.isActive()) {
      throw new AuthCredentialExpiredException();
    }

    const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(ACCESS_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requirement !== undefined) {
      this.roleResolver.requireRole(requirement.resource, requirement.operation, employee.role);
    }

    request.access = {
      tenantId,
      employee,
      scope:
        requirement === undefined ? RowScope.None : this.scopeResolver.resolve(employee.role, requirement.resource),
      credential,
    };

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_METADATA, [context.getHandler(), context.getClass()]) ===
      true
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
