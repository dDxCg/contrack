import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { CostCategory } from '../../models/contract-costs/contract-cost.entity';

export class UpsertContractCostBodyDto {
  @IsEnum(CostCategory)
  category!: CostCategory;

  @IsDateString()
  period!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}

export class ContractCostQueryDto {
  @IsOptional()
  @IsDateString()
  period?: string;
}

export class ProfitabilityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  months: number = 6;
}
