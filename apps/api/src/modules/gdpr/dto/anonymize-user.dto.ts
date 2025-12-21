import { IsString, IsOptional } from 'class-validator';

export class AnonymizeUserDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string; // Razón de la anonimización (opcional, para logs)
}

