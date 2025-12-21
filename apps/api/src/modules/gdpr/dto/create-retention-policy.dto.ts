import { IsString, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateRetentionPolicyDto {
  @IsString()
  dataType: string; // 'conversations', 'messages', 'appointments', 'leads', 'knowledge', etc.

  @IsNumber()
  @Min(0)
  retentionDays: number; // Días de retención (0 = sin límite)

  @IsBoolean()
  autoDelete: boolean; // Si se elimina automáticamente al expirar
}

