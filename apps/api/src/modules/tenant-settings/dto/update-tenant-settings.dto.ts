import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsString()
  @IsOptional()
  @IsIn(['es', 'en', 'es-ES', 'en-US'])
  defaultLocale?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ES', 'CH', 'FR', 'DE', 'IT', 'PT'])
  country?: string;

  @IsString()
  @IsOptional()
  @IsIn(['EU', 'CH'])
  dataRegion?: string;

  @IsString()
  @IsOptional()
  @IsIn(['META_API', 'EVOLUTION_API', 'NONE'])
  whatsappProvider?: string;

  @IsString()
  @IsOptional()
  @IsIn(['CAL_COM', 'GOOGLE', 'CUSTOM', 'NONE'])
  calendarProvider?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  businessType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  industryNotes?: string;
}

