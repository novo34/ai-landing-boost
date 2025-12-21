import { IsString, IsOptional, IsObject, IsEnum, IsBoolean } from 'class-validator';

export class UpdatePlatformFlowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  workflow?: any;

  @IsEnum(['ONBOARDING', 'NOTIFICATIONS', 'LEADS', 'REPORTS', 'OPERATIONS'])
  @IsOptional()
  category?: 'ONBOARDING' | 'NOTIFICATIONS' | 'LEADS' | 'REPORTS' | 'OPERATIONS';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
