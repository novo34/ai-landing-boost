import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';
import { $Enums } from '@prisma/client';

/**
 * DTO para crear un canal
 */
export class CreateChannelDto {
  @IsEnum($Enums.channel_type)
  @IsNotEmpty()
  type: $Enums.channel_type;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum($Enums.channel_status)
  @IsOptional()
  status?: $Enums.channel_status;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}

