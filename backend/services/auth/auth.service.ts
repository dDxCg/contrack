import { Inject, Injectable } from '@nestjs/common';
import { SessionView } from '../../dtos/auth/auth.response.dto';
import { EmployeeView } from '../../dtos/employees/employees.response.dto';
import { AuthCredentialExpiredException, AuthInvalidCredentialsException } from '../../models/domain-errors';
import { Employee } from '../../models/employees/employee.entity';
import { EmployeeRepository } from '../../repositories/employees/employee.repository';
import { TenantRepository } from '../../repositories/tenants/tenant.repository';
import { AccessContext } from '../access-control/access-context';
import { toEmployeeView } from '../employees/employee.service';
import { PASSWORD_HASHER, PasswordHasher } from './password-hasher.service';
import { TokenService } from './token.service';
export interface LoginCommand {
  email: string;
  password: string;
}
@Injectable()
export class AuthService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly tokenService: TokenService,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}
  async login(command: LoginCommand): Promise<SessionView> {
    const employee = await this.employeeRepository.findByEmail(command.email);
    if (employee === null || !employee.isActive() || employee.passwordHash === null) {
      throw new AuthInvalidCredentialsException();
    }
    const tenant = await this.tenantRepository.findById(employee.tenantId);
    if (tenant === null) {
      throw new AuthInvalidCredentialsException();
    }
    tenant.assertActive();
    if (!(await this.passwordHasher.verify(command.password, employee.passwordHash))) {
      throw new AuthInvalidCredentialsException();
    }
    return this.issue(employee);
  }
  async refresh(refreshToken: string): Promise<SessionView> {
    const payload = this.tokenService.verifyRefresh(refreshToken);
    const employee = await this.employeeRepository.findById(payload.tenant_id, payload.sub);
    if (employee === null || !employee.isActive()) {
      throw new AuthCredentialExpiredException();
    }
    this.tokenService.revoke(payload);
    return this.issue(employee);
  }
  async logout(access: AccessContext, refreshToken?: string): Promise<void> {
    this.tokenService.revoke(access.credential);
    if (refreshToken === undefined) {
      return;
    }
    try {
      this.tokenService.revoke(this.tokenService.verifyRefresh(refreshToken));
    } catch {}
  }
  me(access: AccessContext): EmployeeView {
    return toEmployeeView(access.employee);
  }
  private issue(employee: Employee): SessionView {
    return {
      token: this.tokenService.signAccess(employee),
      refresh_token: this.tokenService.signRefresh(employee),
      expires_in: this.tokenService.accessTtlSeconds,
      employee: {
        id: employee.id,
        tenant_id: employee.tenantId,
        name: employee.name,
        role: employee.role,
      },
    };
  }
}
