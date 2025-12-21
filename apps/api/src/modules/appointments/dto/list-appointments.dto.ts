import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para listar citas con filtros
 */
export class ListAppointmentsDto {
  @IsString()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  participantPhone?: string;

  @IsEnum($Enums.appointment_status)
  @IsOptional()
  status?: $Enums.appointment_status;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

