import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { EmployeeStatus, Role } from '../Models/employee.entity';

export class EmployeeBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact?: string | null;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  password?: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  manager_id?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  team_id?: number | null;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
