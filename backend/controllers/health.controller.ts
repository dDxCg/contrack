import { Controller, Get, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../data/db-context/data-source';
import { Public } from '../services/access-control/access.decorator';

export interface HealthStatus {
  status: 'ok';
}

@Controller()
export class HealthController {
  constructor(
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get('healthz')
  live(): HealthStatus {
    return { status: 'ok' };
  }

  @Public()
  @Get('readyz')
  async ready(): Promise<HealthStatus> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }
}
