import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SessionView } from '../../dtos/auth/auth.response.dto';
import { EmployeeView } from '../../dtos/employees/employees.response.dto';
import { AuthCredentialExpiredException, AuthInvalidCredentialsException } from '../../models/domain-errors';
import { Employee } from '../../models/employees/employee.entity';
import { EmployeeRepository, IEmployeeRepository } from '../../repositories/employees/employee.repository';
import { ITenantRepository, TenantRepository } from '../../repositories/tenants/tenant.repository';
import { toEmployeeView } from '../../dtos/employees/employees.mapper';
import { AccessContext } from '../access-control/access-context';
import { PASSWORD_HASHER, PasswordHasher } from './password-hasher.service';
import { TokenService } from './token.service';

export interface LoginCommand {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(TenantRepository)
    private readonly tenantRepository: ITenantRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    private readonly tokenService: TokenService,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  private dummyHashPromise: Promise<string> | null = null;

  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= this.passwordHasher.hash(randomUUID());

    return this.dummyHashPromise;
  }

  async login(command: LoginCommand): Promise<SessionView> {
    const found = await this.employeeRepository.findByEmail(command.email);
    const employee = found !== null && found.isActive() && found.passwordHash !== null ? found : null;
    const tenant = employee !== null ? await this.tenantRepository.findById(employee.tenantId) : null;
    const passwordMatches = await this.passwordHasher.verify(
      command.password,
      employee?.passwordHash ?? (await this.dummyHash()),
    );

    if (employee === null || tenant === null || !passwordMatches) {
      throw new AuthInvalidCredentialsException();
    }

    tenant.assertActive();

    return this.issue(employee);
  }

  async refresh(refreshToken: string): Promise<SessionView> {
    const payload = await this.tokenService.verifyRefresh(refreshToken);
    const employee = await this.employeeRepository.findById(payload.tenant_id, payload.sub);

    if (employee === null || !employee.isActive()) {
      throw new AuthCredentialExpiredException();
    }

    const tenant = await this.tenantRepository.findById(payload.tenant_id);

    if (tenant === null) {
      throw new AuthCredentialExpiredException();
    }

    tenant.assertActive();
    await this.tokenService.revoke(payload);

    return this.issue(employee);
  }

  async logout(access: AccessContext, refreshToken?: string): Promise<void> {
    await this.tokenService.revoke(access.credential);

    if (refreshToken === undefined) {
      return;
    }

    try {
      await this.tokenService.revoke(await this.tokenService.verifyRefresh(refreshToken));
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
