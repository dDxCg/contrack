import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ValidationFailedException } from './Models/domain-errors';
import { AuthController } from './Controllers/auth.controller';
import { ContractsController } from './Controllers/contracts.controller';
import { CustomersController } from './Controllers/customers.controller';
import { EmployeesController } from './Controllers/employees.controller';
import { TeamsController } from './Controllers/teams.controller';
import { DATA_SOURCE, createDataSource } from './Data/DbContext/data-source';
import { ContractItemRepository } from './Repositories/contract-item.repository';
import { ContractRepository } from './Repositories/contract.repository';
import { ContractSiteRepository } from './Repositories/contract-site.repository';
import { CustomerRepository } from './Repositories/customer.repository';
import { EmployeeRepository } from './Repositories/employee.repository';
import { ShiftRepository } from './Repositories/shift.repository';
import { TeamRepository } from './Repositories/team.repository';
import { TenantRepository } from './Repositories/tenant.repository';
import { AccessControlGuard } from './Services/AccessControl/access-control.guard';
import { AUTH_CONFIG, AuthConfig, loadAuthConfig } from './Services/AccessControl/auth.config';
import { CLOCK, SystemClock } from './Services/AccessControl/clock';
import {
  DomainExceptionFilter,
  toValidationViolations,
} from './Services/AccessControl/domain-exception.filter';
import { RoleResolver } from './Services/AccessControl/role-resolver';
import { ScopeResolver } from './Services/AccessControl/scope-resolver';
import { TenantResolver } from './Services/AccessControl/tenant-resolver';
import { AuthService } from './Services/auth.service';
import { ContractService } from './Services/contract.service';
import { CustomerService } from './Services/customer.service';
import { EmployeeService } from './Services/employee.service';
import { BcryptPasswordHasher, PASSWORD_HASHER } from './Services/password-hasher.service';
import { ScheduleGeneratorService } from './Services/schedule-generator.service';
import { TeamService } from './Services/team.service';
import { TokenService } from './Services/token.service';

@Module({
  controllers: [
    AuthController,
    ContractsController,
    CustomersController,
    EmployeesController,
    TeamsController,
  ],
  providers: [
    { provide: AUTH_CONFIG, useFactory: () => loadAuthConfig(process.env) },
    { provide: DATA_SOURCE, useFactory: () => createDataSource(process.env) },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: JwtService,
      useFactory: (config: AuthConfig) => new JwtService({ secret: config.jwtSecret }),
      inject: [AUTH_CONFIG],
    },
    {
      provide: PASSWORD_HASHER,
      useFactory: (config: AuthConfig) => new BcryptPasswordHasher(config.bcryptRounds),
      inject: [AUTH_CONFIG],
    },
    { provide: APP_GUARD, useClass: AccessControlGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    TenantRepository,
    CustomerRepository,
    EmployeeRepository,
    TeamRepository,
    ContractRepository,
    ContractSiteRepository,
    ContractItemRepository,
    ShiftRepository,
    TenantResolver,
    RoleResolver,
    ScopeResolver,
    TokenService,
    AuthService,
    CustomerService,
    EmployeeService,
    TeamService,
    ContractService,
    ScheduleGeneratorService,
  ],
})
export class AppModule {}

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new ValidationFailedException(toValidationViolations(errors)),
    }),
  );
}
