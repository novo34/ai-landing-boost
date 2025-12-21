import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO para importar un documento
 * 
 * Por ahora solo acepta URL del documento.
 * El procesamiento real se implementará en PRD-16.
 */
export class ImportDocumentDto {
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
  documentUrl: string; // URL del documento a importar

  @IsOptional()
  metadata?: Record<string, unknown>;
}

