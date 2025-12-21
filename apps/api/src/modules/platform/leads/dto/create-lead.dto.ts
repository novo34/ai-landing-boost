import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  source: string; // WHATSAPP, WEBCHAT, LANDING, MANUAL, IMPORT, etc.

  @IsString()
  @IsOptional()
  interest?: string; // Plan de interés

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}
