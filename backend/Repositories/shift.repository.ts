import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import { DATA_SOURCE } from '../Data/DbContext/data-source';
import { Shift } from '../Models/shift.entity';
import { TenantScopedRepository } from './tenant-scoped.repository';

@Injectable()
export class ShiftRepository extends TenantScopedRepository<Shift> {
  protected override readonly entity: EntityTarget<Shift> = Shift;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    super(dataSource);
  }

  async createMany(shifts: readonly Shift[]): Promise<void> {
    if (shifts.length === 0) {
      return;
    }

    const statusId = await this.lookupId('shift_statuses', shifts[0].status);
    for (const shift of shifts) {
      shift.statusId = statusId;
    }

    await this.dataSource.getRepository(Shift).save([...shifts]);
  }
}
