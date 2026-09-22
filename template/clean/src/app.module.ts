import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ContractsModule } from './modules/contracts/frameworks-drivers/web/contracts.module';
import { HealthController } from './health.controller';

// Minimal bootstrap: wire just the contracts module plus a trivial health
// check, mirroring backend/app.module.ts's ValidationPipe style at a much
// smaller scale (no auth guards, no throttling, no alert jobs — see
// README.md's "Deliberate simplifications").
@Module({
  imports: [ContractsModule],
  controllers: [HealthController],
})
export class AppModule {}

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
