import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { PhotoType, ShiftPhoto } from '../../models/shifts/shift-photo.entity';
import { TenantScopedRepository } from '../tenant-scoped.repository';
export interface IShiftPhotoRepository {
  createMany(photos: readonly ShiftPhoto[], tx?: EntityManager): Promise<void>;
}
@Injectable()
export class ShiftPhotoRepository
  extends TenantScopedRepository<ShiftPhoto>
  implements IShiftPhotoRepository
{
  protected override readonly entity: EntityTarget<ShiftPhoto> = ShiftPhoto;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }
  async createMany(photos: readonly ShiftPhoto[], tx?: EntityManager): Promise<void> {
    if (photos.length === 0) {
      return;
    }
    const typeIds = new Map<PhotoType, number>();
    for (const photo of photos) {
      const cached = typeIds.get(photo.type);
      const typeId = cached ?? (await this.lookupId('photo_types', photo.type, tx));
      typeIds.set(photo.type, typeId);
      photo.typeId = typeId;
    }
    await this.mgr(tx)
      .getRepository(ShiftPhoto)
      .save([...photos]);
  }
}
