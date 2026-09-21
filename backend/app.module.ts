import { INestApplication, MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ValidationFailedException } from './models/domain-errors';
import { AlertsController } from './controllers/alerts/alerts.controller';
import { AuthController } from './controllers/auth/auth.controller';
import { ContractCostsController } from './controllers/contract-costs/contract-costs.controller';
import { ContractsController } from './controllers/contracts/contracts.controller';
import { CustomersController } from './controllers/customers/customers.controller';
import { DashboardController } from './controllers/dashboard/dashboard.controller';
import { EmployeesController } from './controllers/employees/employees.controller';
import { FieldController } from './controllers/field/field.controller';
import { HealthController } from './controllers/health.controller';
import { PlatformAuthController } from './controllers/platform/platform-auth.controller';
import { PlatformDashboardController } from './controllers/platform/platform-dashboard.controller';
import { TenantsController } from './controllers/platform/tenants.controller';
import { ReconciliationController } from './controllers/statements/reconciliation.controller';
import { ShiftsController } from './controllers/shifts/shifts.controller';
import { StatementsController } from './controllers/statements/statements.controller';
import { TeamsController } from './controllers/teams/teams.controller';
import { CHANNEL_CLIENT } from './data/channel-client/channel-client';
import { NullChannelClient } from './data/channel-client/null-channel-client';
import {
  OBJECT_STORAGE_CLIENT,
  ObjectStorageClient,
} from './data/object-storage-client/object-storage-client';
import { NullObjectStorageClient } from './data/object-storage-client/null-object-storage-client';
import { S3ObjectStorageClient } from './data/object-storage-client/s3-object-storage-client';
import {
  STORAGE_CONFIG,
  StorageConfig,
  loadStorageConfig,
} from './data/object-storage-client/storage.config';
import { DATA_SOURCE, createDataSource } from './data/db-context/data-source';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { securityHeaders } from './middleware/security-headers';
import { AlertRepository } from './repositories/alerts/alert.repository';
import { ContractCostRepository } from './repositories/contract-costs/contract-cost.repository';
import { ContractItemRepository } from './repositories/contracts/contract-item.repository';
import { ContractRepository } from './repositories/contracts/contract.repository';
import { ContractSiteRepository } from './repositories/contracts/contract-site.repository';
import { CustomerRepository } from './repositories/customers/customer.repository';
import { EmployeeRepository } from './repositories/employees/employee.repository';
import { PlatformAdminRepository } from './repositories/platform/platform-admin.repository';
import { ShiftPhotoRepository } from './repositories/shifts/shift-photo.repository';
import { ShiftRepository } from './repositories/shifts/shift.repository';
import { StatementRepository } from './repositories/statements/statement.repository';
import { TeamRepository } from './repositories/teams/team.repository';
import { TenantRepository } from './repositories/tenants/tenant.repository';
import { AccessControlGuard } from './services/access-control/access-control.guard';
import { AUTH_CONFIG, AuthConfig, loadAuthConfig } from './services/access-control/auth.config';
import { CLOCK, IClock, SystemClock } from './services/access-control/clock';
import { CREDENTIAL_RESOLVERS, CredentialResolver } from './services/access-control/credential-resolver';
import { DeskCredentialResolver } from './services/access-control/desk-credential-resolver';
import {
  DomainExceptionFilter,
  toValidationViolations,
} from './services/access-control/domain-exception.filter';
import { PlatformCredentialResolver } from './services/access-control/platform-credential-resolver';
import { RoleResolver } from './services/access-control/role-resolver';
import { ScopeResolver } from './services/access-control/scope-resolver';
import { TenantResolver } from './services/access-control/tenant-resolver';
import { AlertJobScheduler } from './services/alerts/alert-job-scheduler.service';
import { AlertJobService } from './services/alerts/alert-job.service';
import { AlertService } from './services/alerts/alert.service';
import {
  DISTRIBUTED_LOCK,
  InMemoryDistributedLock,
  RedisDistributedLock,
  type DistributedLock,
} from './services/alerts/distributed-lock';
import Redis from 'ioredis';
import { REDIS_CLIENT, createRedisClient } from './data/redis-client';
import { AuthService } from './services/auth/auth.service';
import {
  InMemoryRevocationStore,
  RedisRevocationStore,
  REVOCATION_STORE,
  type RevocationStore,
} from './services/auth/revocation-store';
import { PlatformAuthService } from './services/platform/platform-auth.service';
import { PlatformDashboardService } from './services/platform/platform-dashboard.service';
import { TenantService } from './services/platform/tenant.service';
import { ContractCostService } from './services/contract-costs/contract-cost.service';
import { ContractProfitabilityService } from './services/contract-costs/contract-profitability.service';
import { ContractAssembler } from './services/contracts/contract-assembler';
import { ContractService } from './services/contracts/contract.service';
import { CostEstimationService } from './services/contract-costs/cost-estimation.service';
import { CustomerService } from './services/customers/customer.service';
import { DashboardService } from './services/dashboard/dashboard.service';
import { DispatchService } from './services/shifts/dispatch.service';
import { DisputeService } from './services/shifts/dispute.service';
import { EmployeeService } from './services/employees/employee.service';
import { FieldLinkService } from './services/field/field-link.service';
import { FieldSubmissionService } from './services/field/field-submission.service';
import { FieldUploadService } from './services/field/field-upload.service';
import { RandomUploadKeyFactory, UPLOAD_KEY_FACTORY } from './services/field/upload-key-factory';
import { FieldTokenService } from './services/field/field-token.service';
import { BcryptPasswordHasher, PASSWORD_HASHER } from './services/auth/password-hasher.service';
import { ReconciliationService } from './services/statements/reconciliation.service';
import { ScheduleGeneratorService } from './services/contracts/schedule-generator.service';
import { StatementService } from './services/statements/statement.service';
import { TeamService } from './services/teams/team.service';
import { TokenService } from './services/auth/token.service';
@Module({
  imports: [ScheduleModule.forRoot(), ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [
    AlertsController,
    AuthController,
    ContractCostsController,
    ContractsController,
    CustomersController,
    DashboardController,
    EmployeesController,
    FieldController,
    HealthController,
    PlatformAuthController,
    PlatformDashboardController,
    TenantsController,
    ReconciliationController,
    ShiftsController,
    StatementsController,
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessControlGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: CHANNEL_CLIENT, useClass: NullChannelClient },
    { provide: STORAGE_CONFIG, useFactory: (): StorageConfig | null => loadStorageConfig(process.env) },
    {
      provide: OBJECT_STORAGE_CLIENT,
      useFactory: (config: StorageConfig | null): ObjectStorageClient =>
        config === null ? new NullObjectStorageClient() : new S3ObjectStorageClient(config),
      inject: [STORAGE_CONFIG],
    },
    { provide: UPLOAD_KEY_FACTORY, useClass: RandomUploadKeyFactory },
    { provide: REDIS_CLIENT, useFactory: (): Redis | null => createRedisClient(process.env) },
    {
      provide: DISTRIBUTED_LOCK,
      useFactory: (clock: IClock, redis: Redis | null): DistributedLock =>
        redis === null ? new InMemoryDistributedLock(clock) : new RedisDistributedLock(redis),
      inject: [CLOCK, REDIS_CLIENT],
    },
    {
      provide: REVOCATION_STORE,
      useFactory: (clock: IClock, redis: Redis | null): RevocationStore =>
        redis === null ? new InMemoryRevocationStore(clock) : new RedisRevocationStore(redis, clock),
      inject: [CLOCK, REDIS_CLIENT],
    },
    AlertJobScheduler,
    DeskCredentialResolver,
    PlatformCredentialResolver,
    {
      provide: CREDENTIAL_RESOLVERS,
      useFactory: (
        desk: DeskCredentialResolver,
        platform: PlatformCredentialResolver,
      ): CredentialResolver[] => [desk, platform],
      inject: [DeskCredentialResolver, PlatformCredentialResolver],
    },
    TenantRepository,
    PlatformAdminRepository,
    CustomerRepository,
    EmployeeRepository,
    TeamRepository,
    ContractRepository,
    ContractSiteRepository,
    ContractItemRepository,
    ShiftRepository,
    ShiftPhotoRepository,
    StatementRepository,
    ContractCostRepository,
    AlertRepository,
    TenantResolver,
    RoleResolver,
    ScopeResolver,
    TokenService,
    FieldTokenService,
    AuthService,
    CustomerService,
    EmployeeService,
    TeamService,
    ContractService,
    ContractAssembler,
    ScheduleGeneratorService,
    DispatchService,
    DisputeService,
    FieldLinkService,
    FieldSubmissionService,
    FieldUploadService,
    StatementService,
    ReconciliationService,
    ContractCostService,
    CostEstimationService,
    ContractProfitabilityService,
    AlertJobService,
    AlertService,
    DashboardService,
    PlatformAuthService,
    TenantService,
    PlatformDashboardService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
export function configureApp(app: INestApplication, env: NodeJS.ProcessEnv = process.env): void {
  app.setGlobalPrefix('api/v1');
  app.use(securityHeaders());
  app.enableCors({ origin: corsOrigins(env), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new ValidationFailedException(toValidationViolations(errors)),
    }),
  );
}
export function corsOrigins(env: NodeJS.ProcessEnv): string[] | boolean {
  const raw = env.CORS_ORIGINS;
  if (raw === undefined || raw.trim() === '') {
    return false;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
}
