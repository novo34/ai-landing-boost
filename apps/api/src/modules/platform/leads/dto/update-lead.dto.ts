import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateLeadDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  interest?: string;

  @IsEnum(['NEW', 'CONTACTED', 'QUALIFIED', 'OPPORTUNITY', 'CUSTOMER', 'LOST'])
  @IsOptional()
  status?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'OPPORTUNITY' | 'CUSTOMER' | 'LOST';

  @IsEnum(['LEAD_CAPTURED', 'CONTACTED', 'QUALIFIED', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'])
  @IsOptional()
  stage?: 'LEAD_CAPTURED' | 'CONTACTED' | 'QUALIFIED' | 'DEMO' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
