import { SetMetadata } from '@nestjs/common';
import { $Enums } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: $Enums.tenantmembership_role[]) => SetMetadata(ROLES_KEY, roles);

