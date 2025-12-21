import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  to: string;

  @IsOptional()
  @IsString()
  subject?: string;
}


