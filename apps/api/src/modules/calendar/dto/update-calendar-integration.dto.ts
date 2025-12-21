import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * DTO para actualizar una integración de calendario
 */
export class UpdateCalendarIntegrationDto {
  @IsObject()
  @IsOptional()
  credentials?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  status?: string;
}

