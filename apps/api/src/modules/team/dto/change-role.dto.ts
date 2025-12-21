import { IsEnum } from 'class-validator';
import { $Enums } from '@prisma/client';

export class ChangeRoleDto {
  @IsEnum($Enums.tenantmembership_role)
  role: $Enums.tenantmembership_role;
}

