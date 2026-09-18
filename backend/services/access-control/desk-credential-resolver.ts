import { Injectable } from '@nestjs/common';
import { AuthCredentialExpiredException } from '../../models/domain-errors';
import { EmployeeRepository } from '../../repositories/employees/employee.repository';
import type { AccessTokenPayload, TokenClaims } from '../auth/token.service';
import { AccessContext } from './access-context';
import { AccessRequirement } from './access.decorator';
import { CredentialResolver } from './credential-resolver';
import { RoleResolver } from './role-resolver';
import { RowScope } from './row-scope';
import { ScopeResolver } from './scope-resolver';
import { TenantResolver } from './tenant-resolver';
@Injectable()
export class DeskCredentialResolver implements CredentialResolver {
  readonly kind = 'access';
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly tenantResolver: TenantResolver,
    private readonly roleResolver: RoleResolver,
    private readonly scopeResolver: ScopeResolver,
  ) {}
  async resolve(claims: TokenClaims, requirement?: AccessRequirement): Promise<AccessContext> {
    const payload = claims as TokenClaims & Partial<AccessTokenPayload>;
    if (typeof payload.sub !== 'number' || typeof payload.tenant_id !== 'number') {
      throw new AuthCredentialExpiredException();
    }
    const tenantId = this.tenantResolver.fromCredential(payload as AccessTokenPayload);
    const employee = await this.employeeRepository.findById(tenantId, payload.sub);
    if (employee === null || !employee.isActive()) {
      throw new AuthCredentialExpiredException();
    }
    if (requirement !== undefined) {
      this.roleResolver.requireRole(requirement.resource, requirement.operation, employee.role);
    }
    return {
      tenantId,
      employee,
      scope:
        requirement === undefined
          ? RowScope.None
          : this.scopeResolver.resolve(employee.role, requirement.resource),
      credential: payload as AccessTokenPayload,
    };
  }
}
