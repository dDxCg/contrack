import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatementStatus } from '../Models/statement.entity';

export class ComputeStatementBodyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contract_id!: number;

  @IsDateString()
  period!: string;
}

export class StatementListQueryDto {
  @IsOptional()
  @IsDateString()
  period?: string;

  @IsOptional()
  @IsEnum(StatementStatus)
  status?: StatementStatus;

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

export class ReconciliationQueryDto {
  @IsDateString()
  period!: string;
}
