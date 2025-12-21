import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateConsentDto {
  @IsString()
  consentType: string; // 'data_processing', 'marketing', 'analytics', 'cookies', etc.

  @IsBoolean()
  granted: boolean; // true = consentido, false = rechazado

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

