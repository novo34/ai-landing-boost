import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para obtener disponibilidad
 */
export class GetAvailabilityDto {
  @IsString()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsOptional()
  calendarIntegrationId?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

