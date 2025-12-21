import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export class CreatePlatformFlowDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  workflow: any; // JSON del workflow de N8N

  @IsEnum(['ONBOARDING', 'NOTIFICATIONS', 'LEADS', 'REPORTS', 'OPERATIONS'])
  category: 'ONBOARDING' | 'NOTIFICATIONS' | 'LEADS' | 'REPORTS' | 'OPERATIONS';
}
