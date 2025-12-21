import { IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para actualizar una cuenta de WhatsApp
 */
export class UpdateAccountDto {
  @IsObject()
  @IsOptional()
  @Type(() => Object)
  credentials?: {
    // Evolution API
    apiKey?: string;
    instanceName?: string;
    baseUrl?: string;
    // WhatsApp Cloud API
    accessToken?: string;
    phoneNumberId?: string;
    appId?: string;
    appSecret?: string;
  };

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}

