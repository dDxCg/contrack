import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
export class TeamCreateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;
}
export class TeamUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code?: string;
}
