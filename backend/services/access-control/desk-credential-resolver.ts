import { Inject, Injectable } from '@nestjs/common';
import { AuthCredentialExpiredException } from '../../models/domain-errors';
import { EmployeeRepository, IEmployeeRepository } from '../../repositories/employees/employee.repository';
import { TenantRepository } from '../../repositories/tenants/tenant.repository';
import type { TokenClaims } from '../auth/token.service';
import { AccessContext } from './access-context';
import { AccessRequirement } from './access.decorator';
import { CredentialResolver } from './credential-resolver';
import { RoleResolver } from './role-resolver';
import { RowScope } from './row-scope';
import { ScopeResolver } from './scope-resolver';
import { TenantResolver } from './tenant-resolver';
interface DeskTokenClaims extends TokenClaims {
  readonly sub: number;
  readonly tenant_id: number;
}
function isDeskTokenClaims(claims: TokenClaims): claims is DeskTokenClaims {
  const candidate = claims as Partial<DeskTokenClaims>;
  return typeof candidate.sub === 'number' && typeof candidate.tenant_id === 'number';
}
@Injectable()
export class DeskCredentialResolver implements CredentialResolver {
  readonly kind = 'access';
  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly tenantResolver: TenantResolver,
    private readonly roleResolver: RoleResolver,
    private readonly scopeResolver: ScopeResolver,
  ) {}
  async resolve(claims: TokenClaims, requirement?: AccessRequirement): Promise<AccessContext> {
    if (!isDeskTokenClaims(claims)) {
      throw new AuthCredentialExpiredException();
    }
    const payload = claims;
    const tenantId = this.tenantResolver.fromCredential(payload);
    const employee = await this.employeeRepository.findById(tenantId, payload.sub);
    if (employee === null || !employee.isActive()) {
      throw new AuthCredentialExpiredException();
    }
    const tenant = await this.tenantRepository.findById(tenantId);
    if (tenant === null) {
      throw new AuthCredentialExpiredException();
    }
    tenant.assertActive();
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
      credential: payload,
    };
  }
}
