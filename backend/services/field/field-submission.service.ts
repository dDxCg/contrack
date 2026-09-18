import { Inject, Injectable } from '@nestjs/common';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { FieldTokenInvalidException, ShiftEvidenceIncompleteException } from '../../models/domain-errors';
import { PhotoType, ShiftPhoto } from '../../models/shifts/shift-photo.entity';
import { ShiftPhotoRepository } from '../../repositories/shifts/shift-photo.repository';
import { ShiftRepository } from '../../repositories/shifts/shift.repository';
import { CLOCK, IClock } from '../access-control/clock';
import { toShiftView } from '../shifts/dispatch.service';
import { FieldTokenService } from './field-token.service';

export interface FieldSubmissionCommand {
  photoKeys: { before: string[]; after: string[] };
  receiptPhotoKey: string;
  latitude: number | null;
  longitude: number | null;
}

@Injectable()
export class FieldSubmissionService {
  constructor(
    private readonly fieldTokenService: FieldTokenService,
    private readonly shiftRepository: ShiftRepository,
    private readonly shiftPhotoRepository: ShiftPhotoRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async submit(token: string, command: FieldSubmissionCommand): Promise<ShiftView> {
    const claims = this.fieldTokenService.verify(token);

    const missing = missingEvidence(command);
    if (missing.length > 0) {
      throw new ShiftEvidenceIncompleteException(missing);
    }

    const shift = await this.shiftRepository.findByIdUnscoped(claims.shift_id);
    if (shift === null) {
      throw new FieldTokenInvalidException();
    }

    shift.complete(
      { receiptPhotoUrl: command.receiptPhotoKey, latitude: command.latitude, longitude: command.longitude },
      this.clock.now(),
    );

    const saved = await this.shiftRepository.update(shift);

    await this.shiftPhotoRepository.createMany([
      ...command.photoKeys.before.map((url) => aPhoto(saved, PhotoType.Before, url)),
      ...command.photoKeys.after.map((url) => aPhoto(saved, PhotoType.After, url)),
    ]);

    return toShiftView(saved);
  }
}

function missingEvidence(command: FieldSubmissionCommand): string[] {
  const missing: string[] = [];

  if (command.photoKeys.before.length === 0) {
    missing.push('before_photo');
  }
  if (command.photoKeys.after.length === 0) {
    missing.push('after_photo');
  }
  if (command.receiptPhotoKey === '') {
    missing.push('receipt_photo');
  }

  return missing;
}

function aPhoto(shift: { id: number; tenantId: number }, type: PhotoType, url: string): ShiftPhoto {
  const photo = new ShiftPhoto();
  photo.tenantId = shift.tenantId;
  photo.shiftId = shift.id;
  photo.type = type;
  photo.url = url;

  return photo;
}
