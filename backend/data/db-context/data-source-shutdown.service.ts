import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from './data-source';

@Injectable()
export class DataSourceShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(DataSourceShutdownService.name);

  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      return;
    }

    await this.dataSource.destroy();
    this.logger.log('Database connection pool closed');
  }
}
