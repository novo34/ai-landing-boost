import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO para crear una colección de conocimiento
 */
export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  language: string; // 'es', 'en', 'de', etc.
}

