import { IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para crear una cuenta de WhatsApp
 */
export class CreateAccountDto {
  @IsEnum($Enums.tenantwhatsappaccount_provider)
  @IsNotEmpty()
  provider: $Enums.tenantwhatsappaccount_provider;

  @IsObject()
  @IsNotEmpty()
  credentials: {
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
}

