import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['TECHNICAL', 'BILLING', 'CONFIGURATION', 'FEATURE_REQUEST', 'OTHER'])
  @IsOptional()
  category?: 'TECHNICAL' | 'BILLING' | 'CONFIGURATION' | 'FEATURE_REQUEST' | 'OTHER';

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsEnum(['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'])
  @IsOptional()
  status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';

  @IsString()
  @IsOptional()
  assignedToId?: string;
}
