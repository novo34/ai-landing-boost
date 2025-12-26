import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { validateEvolutionBaseUrl } from '../../crypto/utils/url-validation.util';

/**
 * DTO para conectar Evolution API del tenant
 */
export class ConnectEvolutionDto {
  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsOptional()
  @IsBoolean()
  testConnection?: boolean; // Opcional: testar conexión ahora
}

/**
 * Valida baseUrl con protección SSRF
 */
export function validateConnectEvolutionDto(dto: ConnectEvolutionDto): void {
  try {
    validateEvolutionBaseUrl(dto.baseUrl, false);
  } catch (error: any) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: error.message,
    });
  }
}
