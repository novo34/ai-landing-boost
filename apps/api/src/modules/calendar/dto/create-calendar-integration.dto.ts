import { IsString, IsNotEmpty, IsEnum, IsObject, IsOptional } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para crear una integración de calendario
 */
export class CreateCalendarIntegrationDto {
  @IsEnum($Enums.calendarintegration_provider)
  @IsNotEmpty()
  provider: $Enums.calendarintegration_provider;

  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, unknown>; // Credenciales específicas del proveedor

  @IsString()
  @IsOptional()
  status?: string;
}

