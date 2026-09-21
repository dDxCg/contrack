import { Inject, Injectable } from '@nestjs/common';
import {
  OBJECT_STORAGE_CLIENT,
  ObjectStorageClient,
} from '../../data/object-storage-client/object-storage-client';
import { UploadTargetView } from '../../dtos/field/field.response.dto';
import { FieldTokenInvalidException, UploadUnsupportedTypeException } from '../../models/domain-errors';
import { IShiftRepository, ShiftRepository } from '../../repositories/shifts/shift.repository';
import { FieldTokenService } from './field-token.service';
import { extensionForContentType, uploadKeyPrefix } from './upload-key';
import { IUploadKeyFactory, UPLOAD_KEY_FACTORY } from './upload-key-factory';
@Injectable()
export class FieldUploadService {
  constructor(
    private readonly fieldTokenService: FieldTokenService,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(OBJECT_STORAGE_CLIENT)
    private readonly storage: ObjectStorageClient,
    @Inject(UPLOAD_KEY_FACTORY)
    private readonly keys: IUploadKeyFactory,
  ) {}
  async issueTarget(token: string, contentType: string): Promise<UploadTargetView> {
    const claims = await this.fieldTokenService.verify(token);
    const shift = await this.shiftRepository.findByIdUnscoped(claims.shift_id);
    if (shift === null) {
      throw new FieldTokenInvalidException();
    }
    const extension = extensionForContentType(contentType);
    if (extension === null) {
      throw new UploadUnsupportedTypeException(contentType);
    }
    const key = `${uploadKeyPrefix(shift.tenantId, shift.id)}${this.keys.next()}.${extension}`;
    const target = await this.storage.presignUpload({ key, contentType });
    return { upload_url: target.uploadUrl, key: target.key };
  }
}
