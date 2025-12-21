import { IsString, IsOptional, IsEnum, IsEmail } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(['TECHNICAL', 'BILLING', 'CONFIGURATION', 'FEATURE_REQUEST', 'OTHER'])
  category: 'TECHNICAL' | 'BILLING' | 'CONFIGURATION' | 'FEATURE_REQUEST' | 'OTHER';

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsString()
  @IsOptional()
  assignedToId?: string;
}
