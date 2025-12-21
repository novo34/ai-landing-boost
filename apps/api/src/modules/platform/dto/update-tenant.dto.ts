import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  dataRegion?: string;

  @IsEnum(['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'])
  @IsOptional()
  status?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';

  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;
}
