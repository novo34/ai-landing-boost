import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, MaxLength } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para crear un agente
 */
export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  whatsappAccountId: string;

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

