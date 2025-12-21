import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { $Enums } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

type TenantRole = $Enums.tenantmembership_role;

/**
 * RbacGuard
 * 
 * Verifica que el usuario tiene uno de los roles requeridos para el tenant actual.
 * 
 * Requisitos:
 * 1. JwtAuthGuard debe estar aplicado (para obtener request.user)
 * 2. TenantContextGuard debe estar aplicado (para obtener request.tenantRole)
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
 * @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
 * @Get('endpoint')
 * async myEndpoint() {
 *   // Solo OWNER o ADMIN pueden acceder
 * }
 * 
 * Nota: Si no se especifica @Roles(), el guard permite acceso a cualquier rol.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener roles requeridos del decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<TenantRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.tenantRole as TenantRole;
    const tenantId = request.tenantId;
    const userId = request.user?.userId;

    // Si no hay tenantRole en el request, denegar acceso
    if (!userRole) {
      // Log para debugging en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.error('[RBAC] No tenantRole encontrado:', {
          endpoint: request.url,
          method: request.method,
          userId,
          tenantId,
          hasUser: !!request.user,
          hasTenantId: !!tenantId,
        });
      }
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.role_required',
      });
    }

    // Verificar que el rol del usuario está en la lista de roles requeridos
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      // Log para debugging en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.error('[RBAC] Rol insuficiente:', {
          endpoint: request.url,
          method: request.method,
          userId,
          tenantId,
          userRole,
          requiredRoles,
        });
      }
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.insufficient_permissions',
      });
    }

    return true;
  }
}

