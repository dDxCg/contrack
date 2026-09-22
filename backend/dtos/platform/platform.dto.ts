import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { TenantStatus } from '../../models/tenants/tenant.entity';

export class PlatformLoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class TenantCreateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  director_email!: string;

  @IsString()
  @IsNotEmpty()
  director_password!: string;
}

export class TenantStatusDto {
  @IsIn([TenantStatus.Active, TenantStatus.Suspended])
  status!: TenantStatus;
}

export class TenantListQueryDto {
  @IsOptional()
  @IsIn([TenantStatus.Active, TenantStatus.Suspended])
  status?: TenantStatus;

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
