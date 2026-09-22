import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import {
  FieldTokenAlreadyUsedException,
  FieldTokenInvalidException,
  ShiftEvidenceIncompleteException,
  UploadKeyUnknownException,
} from '../../models/domain-errors';
import { PhotoType, ShiftPhoto } from '../../models/shifts/shift-photo.entity';
import {
  IShiftPhotoRepository,
  ShiftPhotoRepository,
} from '../../repositories/shifts/shift-photo.repository';
import { IShiftRepository, ShiftRepository, SiteGeofence } from '../../repositories/shifts/shift.repository';
import { CLOCK, IClock } from '../access-control/clock';
import { toShiftView } from '../../dtos/shifts/shifts.mapper';
import { haversineDistanceMeters } from '../../utils/geo';
import { FieldTokenService } from './field-token.service';
import { isKeyIssuedForShift } from './upload-key';

export interface FieldSubmissionCommand {
  photoKeys: {
    before: string[];
    after: string[];
  };
  receiptPhotoKey: string;
  latitude: number | null;
  longitude: number | null;
}

@Injectable()
export class FieldSubmissionService {
  constructor(
    private readonly fieldTokenService: FieldTokenService,
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    @Inject(ShiftPhotoRepository)
    private readonly shiftPhotoRepository: IShiftPhotoRepository,
    @Inject(CLOCK)
    private readonly clock: IClock,
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async submit(token: string, command: FieldSubmissionCommand): Promise<ShiftView> {
    const claims = await this.fieldTokenService.verify(token);
    const missing = missingEvidence(command);

    if (missing.length > 0) {
      throw new ShiftEvidenceIncompleteException(missing);
    }

    const shift = await this.shiftRepository.findByIdUnscoped(claims.shift_id);

    if (shift === null) {
      throw new FieldTokenInvalidException();
    }

    const unknown = unknownPhotoKeys(command, shift.tenantId, shift.id);

    if (unknown.length > 0) {
      throw new UploadKeyUnknownException(unknown);
    }

    const geofence = await this.shiftRepository.siteGeofenceFor(shift.contractItemId);
    shift.complete(
      {
        receiptPhotoUrl: command.receiptPhotoKey,
        latitude: command.latitude,
        longitude: command.longitude,
        geoVerified: isWithinGeofence(geofence, command.latitude, command.longitude),
      },
      this.clock.now(),
    );
    const saved = await this.dataSource.transaction(async (tx) => {
      const claimed = await this.shiftRepository.claimFieldToken(shift.id, this.clock.now(), tx);

      if (!claimed) {
        throw new FieldTokenAlreadyUsedException();
      }

      shift.fieldTokenUsedAt = this.clock.now();
      const updated = await this.shiftRepository.update(shift, tx);
      await this.shiftPhotoRepository.createMany(
        [
          ...command.photoKeys.before.map((url) => aPhoto(updated, PhotoType.Before, url)),
          ...command.photoKeys.after.map((url) => aPhoto(updated, PhotoType.After, url)),
        ],
        tx,
      );

      return updated;
    });
    await this.fieldTokenService.markUsed(claims);

    return toShiftView(saved);
  }
}

function isWithinGeofence(
  geofence: SiteGeofence | null,
  latitude: number | null,
  longitude: number | null,
): boolean {
  if (geofence === null || geofence.latitude === null || geofence.longitude === null) {
    return false;
  }

  if (latitude === null || longitude === null) {
    return false;
  }

  const distance = haversineDistanceMeters(latitude, longitude, geofence.latitude, geofence.longitude);

  return distance <= geofence.radiusMeters;
}

function unknownPhotoKeys(command: FieldSubmissionCommand, tenantId: number, shiftId: number): string[] {
  return [...command.photoKeys.before, ...command.photoKeys.after, command.receiptPhotoKey].filter(
    (key) => !isKeyIssuedForShift(key, tenantId, shiftId),
  );
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

function aPhoto(
  shift: {
    id: number;
    tenantId: number;
  },
  type: PhotoType,
  url: string,
): ShiftPhoto {
  const photo = new ShiftPhoto();
  photo.tenantId = shift.tenantId;
  photo.shiftId = shift.id;
  photo.type = type;
  photo.url = url;

  return photo;
}
