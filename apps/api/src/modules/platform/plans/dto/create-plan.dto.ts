import { IsString, IsOptional, IsInt, IsEnum, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  currency: string; // EUR, CHF, USD, etc.

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsEnum(['MONTHLY', 'YEARLY'])
  interval: 'MONTHLY' | 'YEARLY';

  @IsInt()
  @IsOptional()
  @Min(0)
  maxAgents?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  maxChannels?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  maxMessages?: number; // Opcional, para límites de uso
}
