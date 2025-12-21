import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateInstanceDto {
  @IsString()
  name: string;

  @IsString()
  domain: string;

  @IsString()
  databaseUrl: string;

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
