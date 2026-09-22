import { Controller, Get } from '@nestjs/common';

/** Trivial health endpoint, mirrors backend/controllers/health.controller.ts at a smaller scale. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
