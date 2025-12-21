import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  participantName?: string;

  @IsString()
  @IsOptional()
  participantEmail?: string;
}

