import { IsString, IsOptional, IsDateString, IsEnum, IsIn } from 'class-validator';

export class AnalyticsFiltersDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';
}
