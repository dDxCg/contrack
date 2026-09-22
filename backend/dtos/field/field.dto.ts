import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const OBJECT_KEY_PATTERN = /^$|^(?!.*\.\.)(?!\/)[A-Za-z0-9!_.*'()/-]+$/;
const IMAGE_CONTENT_TYPE_PATTERN = /^image\/[a-z0-9][a-z0-9.+-]*$/;

export class FieldPhotoKeysBodyDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Matches(OBJECT_KEY_PATTERN, { each: true })
  before!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Matches(OBJECT_KEY_PATTERN, { each: true })
  after!: string[];
}

export class FieldSubmissionBodyDto {
  @ValidateNested()
  @Type(() => FieldPhotoKeysBodyDto)
  photo_keys!: FieldPhotoKeysBodyDto;

  @IsString()
  @MaxLength(500)
  @Matches(OBJECT_KEY_PATTERN)
  receipt_photo_key!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}

export class FieldUploadBodyDto {
  @IsString()
  @MaxLength(100)
  @Matches(IMAGE_CONTENT_TYPE_PATTERN)
  content_type!: string;
}
