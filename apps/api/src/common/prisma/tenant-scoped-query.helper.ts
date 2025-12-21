import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Helper para garantizar que queries incluyen tenantId
 * 
 * Uso:
 * const where = requireTenantScoped(tenantId, { id: resourceId });
 * const resource = await prisma.resource.findFirst({ where });
 */
export function requireTenantScoped<T extends Record<string, any>>(
  tenantId: string,
  where: T,
): T & { tenantId: string } {
  if (!tenantId) {
    throw new BadRequestException({
      success: false,
      error_key: 'tenants.tenant_id_required',
      message: 'Tenant ID is required for this operation',
    });
  }

  return {
    ...where,
    tenantId,
  };
}

/**
 * Valida que un recurso pertenece a un tenant antes de operar
 * Lanza NotFoundException si no pertenece (no revela existencia)
 * 
 * Uso:
 * await validateResourceTenant(prisma, 'agent', agentId, tenantId);
 * // Ahora es seguro operar con el recurso
 */
export async function validateResourceTenant(
  prisma: PrismaService,
  model: string,
  resourceId: string,
  tenantId: string,
): Promise<void> {
  if (!tenantId) {
    throw new BadRequestException({
      success: false,
      error_key: 'tenants.tenant_id_required',
      message: 'Tenant ID is required for this operation',
    });
  }

  // Usar findFirst para validar pertenencia
  const resource = await (prisma as any)[model].findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });

  if (!resource) {
    // No revelar existencia del recurso (seguridad)
    throw new NotFoundException({
      success: false,
      error_key: `${model}.not_found`,
      message: 'Resource not found',
    });
  }
}

/**
 * Helper para crear where clause tenant-scoped
 * Útil cuando necesitas construir where clauses complejos
 * 
 * Uso:
 * const where = withTenantId(tenantId, {
 *   status: 'ACTIVE',
 *   name: { contains: search },
 * });
 */
export function withTenantId<T extends Record<string, any>>(
  tenantId: string,
  where: T,
): T & { tenantId: string } {
  return requireTenantScoped(tenantId, where);
}
