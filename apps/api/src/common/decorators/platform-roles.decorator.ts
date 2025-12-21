import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ROLES_KEY = 'platform-roles';
export type PlatformRole = 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT';

export const PlatformRoles = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);
