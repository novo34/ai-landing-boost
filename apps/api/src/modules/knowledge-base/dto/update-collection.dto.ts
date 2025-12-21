import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO para actualizar una colección de conocimiento
 */
export class UpdateCollectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  language?: string;
}

