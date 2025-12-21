import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para actualizar una fuente de conocimiento
 */
export class UpdateSourceDto {
  @IsString()
  @IsOptional()
  collectionId?: string;

  @IsEnum($Enums.knowledgesource_type)
  @IsOptional()
  type?: $Enums.knowledgesource_type;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

