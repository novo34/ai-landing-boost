import { IsString, IsEmail, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SmtpSettingsDto {
  @IsString()
  fromName: string;

  @IsEmail()
  fromEmail: string;

  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @IsString()
  host: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @Type(() => Boolean)
  @IsBoolean()
  secure: boolean;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  tls?: any;
}


