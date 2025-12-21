import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdateRetentionPolicyDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  retentionDays?: number;

  @IsOptional()
  @IsBoolean()
  autoDelete?: boolean;
}

