import { IsString, IsNotEmpty, IsNumber, IsObject, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO para crear una regla de calendario para un agente
 */
export class CreateCalendarRuleDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  calendarIntegrationId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(5)
  @Max(480)
  duration: number; // Duración en minutos

  @IsObject()
  @IsNotEmpty()
  availableHours: {
    start: string; // "09:00"
    end: string; // "18:00"
  };

  @IsObject()
  @IsOptional()
  availableDays?: string[]; // ["MONDAY", "TUESDAY", ...]

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  bufferMinutes?: number; // Tiempo de buffer entre citas

  @IsObject()
  @IsOptional()
  cancellationPolicy?: Record<string, unknown>;
}

