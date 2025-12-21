import { IsString, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para actualizar un canal
 */
export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsEnum($Enums.channel_status)
  @IsOptional()
  status?: $Enums.channel_status;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}

