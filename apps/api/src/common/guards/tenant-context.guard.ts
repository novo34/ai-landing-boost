import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../audit/audit-logger.service';

/**
 * TenantContextGuard
 * 
 * Determina el tenant activo usando la siguiente prioridad:
 * 1. tenantId del JWT payload (fuente de verdad principal - firmado, no puede ser falsificado)
 * 2. Header x-tenant-id (override controlado - solo si usuario tiene membership en ambos tenants)
 * 3. Primer tenant del usuario (fallback)
 * 
 * Verifica que:
 * 1. El usuario autenticado tiene un TenantMembership para ese tenant
 * 2. Si header difiere de JWT, valida membership antes de permitir override
 * 3. Adjunta el tenantId y tenantRole al Request para uso en servicios
 * 
 * Seguridad:
 * - JWT es prioridad 1 para prevenir spoofing de header
 * - Header override requiere validación de membership explícita
 * - Default deny: si falta tenantId o no hay membership, denegar acceso
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, TenantContextGuard)
 * @Get('endpoint')
 * async myEndpoint(@CurrentTenant() tenant: { id: string; role: string }) {
 *   // tenant.id y tenant.role disponibles
 * }
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private auditLogger: AuditLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Debe venir del JwtAuthGuard

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.unauthorized',
      });
    }

    // PRIORIDAD 1: JWT (Fuente de Verdad)
    // El tenantId del JWT es la fuente de verdad porque está firmado y no puede ser falsificado
    let tenantId = user.tenantId;

    // PRIORIDAD 2: Header x-tenant-id (Override Controlado)
    // Permite cambiar de tenant en runtime, pero solo si el usuario tiene membership en ambos
    const headerTenantId = request.headers['x-tenant-id'] || request.headers['X-Tenant-Id'];
    let headerTenantIdProcessed: string | undefined;
    
    if (headerTenantId) {
      // Si es un array, tomar el primer elemento
      if (Array.isArray(headerTenantId)) {
        headerTenantIdProcessed = headerTenantId[0];
      } else {
        headerTenantIdProcessed = typeof headerTenantId === 'string' ? headerTenantId : String(headerTenantId);
      }
    }
    
    // Si hay header y difiere del JWT, validar membership antes de permitir override
    if (headerTenantIdProcessed && headerTenantIdProcessed !== tenantId) {
      // Validar que el usuario tiene membership en el tenant del header
      const hasMembership = await this.prisma.tenantmembership.findFirst({
        where: {
          userId: user.userId,
          tenantId: headerTenantIdProcessed,
        },
      });

      if (!hasMembership) {
        // Log de seguridad
        if (process.env.NODE_ENV === 'development') {
          console.error('[TenantContext] ACCESO DENEGADO - Header override sin membership:', {
            userId: user.userId,
            jwtTenantId: tenantId,
            headerTenantId: headerTenantIdProcessed,
            endpoint: request.url,
            method: request.method,
          });
        }
        throw new ForbiddenException({
          success: false,
          error_key: 'tenants.no_access',
        });
      }

      // Registrar override en audit log
      try {
        await this.auditLogger.recordTenantOverride(
          user.userId,
          tenantId,
          headerTenantIdProcessed,
          request.url,
          request.method,
          request.ip || request.headers['x-forwarded-for'] as string || undefined,
          request.headers['user-agent'] as string || undefined,
        );
      } catch (error) {
        // No fallar si audit log falla, solo loguear
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TenantContext] Failed to record audit log:', error);
        }
      }

      // Permitir override
      tenantId = headerTenantIdProcessed;
    } else if (headerTenantIdProcessed && headerTenantIdProcessed === tenantId) {
      // Header coincide con JWT, usar header (comportamiento normal)
      tenantId = headerTenantIdProcessed;
    }
    
    // Log para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[TenantContext] Iniciando verificación:', {
        endpoint: request.url,
        method: request.method,
        userId: user.userId,
        jwtTenantId: user.tenantId || 'no presente',
        headerTenantId: headerTenantIdProcessed || 'no presente',
        finalTenantId: tenantId || 'no presente',
        hasMemberships: !!(user.tenantmembership && user.tenantmembership.length > 0),
      });
    }

    // Prioridad 3: Primer tenant del usuario (fallback)
    if (!tenantId && user.tenantmembership && user.tenantmembership.length > 0) {
      // Buscar tenant activo primero
      const activeMembership = user.tenantmembership.find(
        (m: any) => m.tenant.status === 'ACTIVE' || m.tenant.status === 'TRIAL'
      );
      tenantId = activeMembership?.tenantId || user.tenantmembership[0]?.tenantId;
    }

    if (!tenantId) {
      // Si no hay tenant disponible, permitir acceso pero no adjuntar tenantId
      // Esto permite que algunos endpoints funcionen sin tenant (ej: /users/me)
      return true;
    }

    // CRÍTICO: Verificar que el usuario tiene acceso a este tenant
    // Esta validación previene acceso cross-tenant
    const membership = await this.prisma.tenantmembership.findFirst({
      where: {
        userId: user.userId,
        tenantId: tenantId,
      },
    });

    if (!membership) {
      // Log de seguridad en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.error('[TenantContext] ACCESO DENEGADO - Usuario no tiene membership para este tenant:', {
          userId: user.userId,
          tenantId,
          endpoint: request.url,
          method: request.method,
          userTenants: user.tenantmembership?.map((m: any) => m.tenantId) || [],
        });
      }
      throw new ForbiddenException({
        success: false,
        error_key: 'tenants.no_access',
      });
    }

    // Adjuntar tenantId y rol al request para uso en servicios
    request.tenantId = tenantId;
    request.tenantRole = membership.role;

    // Log para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[TenantContext] Tenant establecido:', {
        tenantId,
        role: membership.role,
        userId: user.userId,
        endpoint: request.url,
        method: request.method,
      });
    }

    return true;
  }
}

