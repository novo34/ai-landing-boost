import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
}

@Controller('session')
export class SessionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Endpoint unificado de sesión.
   * Fuente de verdad: backend (Prisma + guards).
   *
   * Devuelve:
   * - user: datos básicos del usuario
   * - platformRole: rol global de plataforma (PLATFORM_OWNER | PLATFORM_ADMIN | PLATFORM_SUPPORT | null)
   * - tenants: lista de tenants con su rol
   * - currentTenant: tenant actual según TenantContextGuard/JWT
   * 
   * Nota: Excluido del rate limiting porque es un endpoint crítico que se llama frecuentemente
   * y tiene cache en el frontend para evitar peticiones innecesarias.
   */
  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() currentTenant?: { id: string; role: string },
  ) {
    const cacheKey = `session:${user.userId}:${currentTenant?.id || 'none'}`;
    
    // Verificar cache (5 minutos)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Query optimizada con select solo de campos necesarios
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        timeZone: true,
        platformRole: true,
        emailVerified: true, // Incluir emailVerified para verificación de email
        tenantmembership: {
          select: {
            tenantId: true,
            role: true,
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return {
        success: false,
        error_key: 'auth.user_not_found',
      };
    }

    const tenants = dbUser.tenantmembership.map((m) => ({
      tenantId: m.tenantId,
      name: m.tenant.name,
      slug: m.tenant.slug,
      status: m.tenant.status,
      role: m.role,
    }));

    const current =
      currentTenant?.id
        ? tenants.find((t) => t.tenantId === currentTenant.id) || null
        : null;

    const result = {
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          locale: dbUser.locale,
          timeZone: dbUser.timeZone,
          emailVerified: dbUser.emailVerified, // Incluir emailVerified en la respuesta
        },
        platformRole: dbUser.platformRole ?? null,
        tenants,
        currentTenant: current,
      },
    };
    
    // Guardar en cache (5 minutos)
    this.cache.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }
}

