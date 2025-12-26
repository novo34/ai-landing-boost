import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * DTO para crear una instancia de Evolution API
 */
export class CreateInstanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^tenant-[a-zA-Z0-9]+-[a-zA-Z0-9-_]+$/, {
    message: 'Instance name must start with tenant-{tenantId}- prefix',
  })
  instanceName?: string; // Si no se proporciona, se genera con prefijo tenant-{tenantId}-

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +34612345678)',
  })
  phoneNumber?: string;
}
