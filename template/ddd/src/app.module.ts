import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { DATA_SOURCE, createDataSource } from './data-source';
import { ContractsModule } from './contexts/contracts/infrastructure/http/contracts.module';
import { ValidationFailedError } from './contexts/contracts/domain/errors';
import { toValidationViolations } from './contexts/contracts/infrastructure/http/validation';
import { HealthController } from './health.controller';

/**
 * AppModule — minimal bootstrap wiring just the contracts context, mirroring
 * backend/app.module.ts at a much smaller scale (one bounded context instead
 * of ~13, no auth/access-control/redis/S3 wiring since those are other
 * bounded contexts this reference port does not model).
 */
@Module({
  imports: [ContractsModule],
  controllers: [HealthController],
  providers: [{ provide: DATA_SOURCE, useFactory: () => createDataSource() }],
})
export class AppModule {}

/** Mirrors backend/app.module.ts#configureApp: global prefix + the same ValidationPipe -> ValidationFailedError translation. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new ValidationFailedError(toValidationViolations(errors)),
    }),
  );
}
