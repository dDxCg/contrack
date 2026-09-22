import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from './data-source';

@Injectable()
export class DataSourceShutdownService implements OnApplicationShutdown {
  constructor(
    @Inject(DATA_SOURCE) private readonly dataSource: DataSource,
    @InjectPinoLogger(DataSourceShutdownService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      return;
    }

    await this.dataSource.destroy();
    this.logger.info('Database connection pool closed');
  }
}
