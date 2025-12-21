import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para crear una fuente de conocimiento
 */
export class CreateSourceDto {
  @IsString()
  @IsOptional()
  collectionId?: string;

  @IsEnum($Enums.knowledgesource_type)
  @IsNotEmpty()
  type: $Enums.knowledgesource_type;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  url?: string; // Para URL_SCRAPE

  @IsOptional()
  metadata?: Record<string, unknown>;
}

