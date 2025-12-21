import { IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * DTO para reprogramar una cita
 */
export class RescheduleAppointmentDto {
  @IsDateString()
  @IsNotEmpty()
  newStartTime: string;

  @IsDateString()
  @IsNotEmpty()
  newEndTime: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

