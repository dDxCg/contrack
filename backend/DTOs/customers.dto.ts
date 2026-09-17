import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CustomerSegment } from '../Models/customer.entity';

export class CustomerBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsEnum(CustomerSegment)
  segment?: CustomerSegment;
}
