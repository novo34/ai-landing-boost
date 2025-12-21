import { IsString, IsOptional } from 'class-validator';

/**
 * DTO para cancelar una cita
 */
export class CancelAppointmentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

