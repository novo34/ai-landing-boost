import { IsString, IsOptional, IsNumber, IsObject, Min, Max } from 'class-validator';

/**
 * DTO para actualizar una regla de calendario
 */
export class UpdateCalendarRuleDto {
  @IsString()
  @IsOptional()
  calendarIntegrationId?: string;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(480)
  duration?: number;

  @IsObject()
  @IsOptional()
  availableHours?: {
    start: string;
    end: string;
  };

  @IsObject()
  @IsOptional()
  availableDays?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  bufferMinutes?: number;

  @IsObject()
  @IsOptional()
  cancellationPolicy?: Record<string, unknown>;
}

