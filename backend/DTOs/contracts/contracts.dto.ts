import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FrequencyUnit } from '../../models/contracts/contract-item.entity';

export class ContractItemBodyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  frequency_count!: number;

  @IsEnum(FrequencyUnit)
  frequency_unit!: FrequencyUnit;

  @IsOptional()
  @IsString()
  frequency_rule?: string | null;

  @IsNumber()
  @Min(0)
  unit_price!: number;
}

export class ContractSiteBodyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  work_requirements?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractItemBodyDto)
  items!: ContractItemBodyDto[];
}

export class ContractBodyDto {
  @IsInt()
  @Min(1)
  customer_id!: number;

  @IsDateString()
  @MinLength(1)
  signed_at!: string;

  @IsDateString()
  @MinLength(1)
  expires_at!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractSiteBodyDto)
  sites!: ContractSiteBodyDto[];
}
