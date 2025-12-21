import { IsString, IsEmail, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  dataRegion?: string;

  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsEnum(['ACTIVE', 'TRIAL', 'SUSPENDED'])
  @IsOptional()
  initialStatus?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';

  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;
}
