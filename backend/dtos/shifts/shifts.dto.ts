import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { ShiftStatus } from '../../models/shifts/shift.entity';
export class ShiftListQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;
  @IsOptional()
  @IsDateString()
  to?: string;
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignee_id?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contract_id?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  team_id?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  manager_id?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;
}
export class ShiftReassignBodyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignee_id?: number | null;
  @IsOptional()
  @IsDateString()
  scheduled_date?: string;
}
export class ShiftAssignTeamBodyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  team_id?: number | null;
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
