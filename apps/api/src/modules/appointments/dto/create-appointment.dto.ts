import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

/**
 * DTO para crear una cita
 */
export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  participantPhone: string;

  @IsString()
  @IsOptional()
  participantName?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

