import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO para enviar un mensaje de WhatsApp
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string; // Número de teléfono del destinatario

  @IsString()
  @IsNotEmpty()
  message: string; // Contenido del mensaje

  @IsString()
  @IsOptional()
  whatsappAccountId?: string; // ID de la cuenta WhatsApp a usar (opcional, usa la primera si no se especifica)
}

