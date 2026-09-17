import { Inject, Injectable } from '@nestjs/common';
import { AuthCredentialExpiredException, AuthInvalidCredentialsException } from '../Models/domain-errors';
import { Employee, Role } from '../Models/employee.entity';
import { EmployeeRepository } from '../Repositories/employee.repository';
import { TenantRepository } from '../Repositories/tenant.repository';
import { AccessContext } from './AccessControl/access-context';
import { EmployeeView, toEmployeeView } from './employee.service';
import { PASSWORD_HASHER, PasswordHasher } from './password-hasher.service';
import { TokenService } from './token.service';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface SessionEmployeeView {
  id: number;
  tenant_id: number;
  name: string;
  role: Role;
}

export interface SessionView {
  token: string;
  refresh_token: string;
  expires_in: number;
  employee: SessionEmployeeView;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly tokenService: TokenService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
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
    } catch {
      // An unusable refresh token needs no revoking — logging out stays idempotent.
    }
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
