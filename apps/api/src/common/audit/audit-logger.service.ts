import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * AuditLoggerService
 * 
 * Servicio centralizado para registrar operaciones de auditoría.
 * Registra operaciones cross-tenant y tenant overrides para trazabilidad.
 * 
 * Uso:
 * await auditLogger.record('TENANT_OVERRIDE', {
 *   userId: user.userId,
 *   platformRole: user.platformRole,
 *   tenantId: headerTenantId,
 *   metadata: { from: jwtTenantId, to: headerTenantId },
 *   ip: request.ip,
 *   userAgent: request.headers['user-agent'],
 * });
 */
@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Registra una acción en el log de auditoría
   * 
   * @param action Tipo de acción (ej: 'TENANT_OVERRIDE', 'LIST_TENANTS', 'SUSPEND_TENANT')
   * @param data Datos de la acción
   */
  async record(
    action: string,
    data: {
      userId: string;
      platformRole?: string | null;
      tenantId?: string | null;
      resourceType?: string;
      resourceId?: string | null;
      metadata?: Record<string, any>;
      ip?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    try {
      // Determinar resourceType basado en la acción si no se proporciona
      const resourceType = data.resourceType || this.inferResourceType(action);

      // Registrar en PlatformAuditLog (para operaciones de plataforma)
      if (data.platformRole || !data.tenantId) {
        await this.prisma.platformauditlog.create({
          data: {
            userId: data.userId,
            action,
            resourceType,
            resourceId: data.resourceId || null,
            metadata: data.metadata || {},
            ipAddress: data.ip || null,
            userAgent: data.userAgent || null,
          },
        });
      }

      // Log adicional para debugging en desarrollo
      if (process.env.NODE_ENV === 'development') {
        this.logger.log(`[AuditLog] ${action}`, {
          userId: data.userId,
          platformRole: data.platformRole,
          tenantId: data.tenantId,
          resourceType,
          resourceId: data.resourceId,
        });
      }
    } catch (error) {
      // No lanzar error - solo loguear para no interrumpir el flujo
      this.logger.error(`Failed to record audit log: ${action}`, error);
    }
  }

  /**
   * Infiere el tipo de recurso basado en la acción
   */
  private inferResourceType(action: string): string {
    if (action.includes('TENANT')) {
      return 'TENANT';
    }
    if (action.includes('USER')) {
      return 'USER';
    }
    if (action.includes('SUBSCRIPTION')) {
      return 'SUBSCRIPTION';
    }
    if (action.includes('PLAN')) {
      return 'PLAN';
    }
    return 'UNKNOWN';
  }

  /**
   * Registra un tenant override (cuando header difiere de JWT)
   */
  async recordTenantOverride(
    userId: string,
    fromTenantId: string,
    toTenantId: string,
    endpoint: string,
    method: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.record('TENANT_OVERRIDE', {
      userId,
      tenantId: toTenantId,
      resourceType: 'TENANT',
      resourceId: toTenantId,
      metadata: {
        from: fromTenantId,
        to: toTenantId,
        endpoint,
        method,
      },
      ip,
      userAgent,
    });
  }

  /**
   * Registra una operación cross-tenant de PLATFORM_OWNER
   * Obtiene platformRole del usuario automáticamente
   */
  async recordCrossTenantAccess(
    userId: string,
    action: string,
    tenantId: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    // Obtener platformRole del usuario
    let platformRole: string | null = null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { platformRole: true },
      });
      platformRole = user?.platformRole || null;
    } catch (error) {
      this.logger.warn('Failed to get platformRole for audit log', error);
    }

    await this.record(action, {
      userId,
      platformRole,
      tenantId,
      resourceType,
      resourceId,
      metadata,
      ip,
      userAgent,
    });
  }
}
