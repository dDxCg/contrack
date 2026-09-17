import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class FieldPhotoKeysBodyDto {
  @IsArray()
  @IsString({ each: true })
  before!: string[];

  @IsArray()
  @IsString({ each: true })
  after!: string[];
}

export class FieldSubmissionBodyDto {
  @ValidateNested()
  @Type(() => FieldPhotoKeysBodyDto)
  photo_keys!: FieldPhotoKeysBodyDto;

  @IsString()
  receipt_photo_key!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;
}
