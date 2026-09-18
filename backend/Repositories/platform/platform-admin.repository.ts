import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { PlatformAdmin } from '../../models/platform/platform-admin.entity';
@Injectable()
export class PlatformAdminRepository {
  constructor(
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}
  findByUsername(username: string): Promise<PlatformAdmin | null> {
    return this.dataSource.getRepository(PlatformAdmin).findOne({ where: { username } });
  }
  findById(id: number): Promise<PlatformAdmin | null> {
    return this.dataSource.getRepository(PlatformAdmin).findOne({ where: { id } });
  }
}
