import { IsString, IsOptional } from 'class-validator';

export class ExportDataDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv'; // Formato de exportación (por defecto JSON)
}

