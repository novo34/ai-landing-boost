import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLATFORM_ROLES_KEY, PlatformRole } from '../decorators/platform-roles.decorator';

/**
 * PlatformGuard
 * 
 * Verifica que el usuario tiene un rol de plataforma (PLATFORM_OWNER, PLATFORM_ADMIN, PLATFORM_SUPPORT).
 * Puede aceptar roles específicos como parámetro.
 * 
 * Requisitos:
 * 1. JwtAuthGuard debe estar aplicado (para obtener request.user)
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, PlatformGuard)
 * @Get('endpoint')
 * async myEndpoint() {
 *   // Cualquier rol de plataforma puede acceder
 * }
 * 
 * @UseGuards(JwtAuthGuard, PlatformGuard)
 * @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
 * @Get('endpoint')
 * async myEndpoint() {
 *   // Solo OWNER o ADMIN pueden acceder
 * }
 */
@Injectable()
export class PlatformGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.unauthorized',
      });
    }

    // Obtener roles requeridos del decorador (si existe)
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Verificar que el usuario tiene un platformRole
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { platformRole: true, email: true },
    });

    if (!userWithRole || !userWithRole.platformRole) {
      throw new ForbiddenException({
        success: false,
        error_key: 'platform.insufficient_permissions',
        message: 'Platform role required',
      });
    }

    // Si hay roles requeridos, verificar que el usuario tiene uno de ellos
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(userWithRole.platformRole as PlatformRole)) {
        throw new ForbiddenException({
          success: false,
          error_key: 'platform.insufficient_permissions',
          message: 'Insufficient platform permissions',
        });
      }
    }

    // Adjuntar información de plataforma al request
    request.platformUser = {
      userId: user.userId,
      email: userWithRole.email,
      platformRole: userWithRole.platformRole,
    };

    return true;
  }
}
