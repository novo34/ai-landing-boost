import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para crear un flujo n8n
 */
export class CreateN8nFlowDto {
  @IsString()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsNotEmpty()
  workflowId: string; // ID del workflow en n8n

  @IsEnum($Enums.n8nflow_type)
  @IsNotEmpty()
  type: $Enums.n8nflow_type;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

