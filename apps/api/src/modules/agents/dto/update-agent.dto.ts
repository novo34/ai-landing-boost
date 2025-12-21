import { IsString, IsOptional, IsEnum, IsArray, MaxLength } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para actualizar un agente
 */
export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  whatsappAccountId?: string;

  @IsEnum($Enums.agent_status)
  @IsOptional()
  status?: $Enums.agent_status;

  @IsEnum($Enums.agent_languageStrategy)
  @IsOptional()
  languageStrategy?: $Enums.agent_languageStrategy;

  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @IsOptional()
  personalitySettings?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  knowledgeCollectionIds?: string[];

  @IsString()
  @IsOptional()
  calendarIntegrationId?: string;

  @IsString()
  @IsOptional()
  n8nWorkflowId?: string;
}

