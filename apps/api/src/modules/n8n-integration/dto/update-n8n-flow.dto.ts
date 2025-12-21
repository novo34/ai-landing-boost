import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para actualizar un flujo n8n
 */
export class UpdateN8nFlowDto {
  @IsString()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsEnum($Enums.n8nflow_type)
  @IsOptional()
  type?: $Enums.n8nflow_type;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

