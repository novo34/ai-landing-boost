import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO para importar contenido desde una URL
 * 
 * Por ahora solo guarda la URL.
 * El scraping real se implementará en PRD-16.
 */
export class ImportUrlDto {
  @IsString()
  @IsOptional()
  collectionId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  url: string; // URL a hacer scraping

  @IsOptional()
  metadata?: Record<string, unknown>;
}

