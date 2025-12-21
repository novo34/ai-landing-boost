import { IsString, IsOptional, IsInt, IsEnum, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  priceCents?: number;

  @IsEnum(['MONTHLY', 'YEARLY'])
  @IsOptional()
  interval?: 'MONTHLY' | 'YEARLY';

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
  maxMessages?: number;
}
