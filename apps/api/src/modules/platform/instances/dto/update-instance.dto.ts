import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateInstanceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  databaseUrl?: string;

  @IsString()
  @IsOptional()
  stripeKey?: string;

  @IsString()
  @IsOptional()
  n8nUrl?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'MAINTENANCE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}
