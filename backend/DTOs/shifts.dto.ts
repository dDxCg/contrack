import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class ShiftReassignBodyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignee_id?: number | null;

  @IsOptional()
  @IsDateString()
  scheduled_date?: string;
}

export enum DisputeReportedVia {
  Phone = 'phone',
  InPerson = 'in_person',
}

export class ShiftDisputeBodyDto {
  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsEnum(DisputeReportedVia)
  reported_via?: DisputeReportedVia;

  @IsOptional()
  @IsString()
  reported_by?: string;

  @IsOptional()
  @IsDateString()
  reported_at?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
