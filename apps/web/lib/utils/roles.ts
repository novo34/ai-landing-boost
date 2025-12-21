/**
 * Utilidades para manejo de roles y permisos
 * Alineado con el sistema de RBAC del backend
 */

export type TenantRole = 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER';

/**
 * Mapeo de roles a rutas de dashboard
 * Define qué dashboard debe ver cada rol tras login
 * 
 * Nota: Por ahora todas las rutas apuntan a /app ya que los dashboards específicos
 * por rol aún no están implementados. En el futuro se pueden crear:
 * - /app/admin para OWNER y ADMIN
 * - /app/agent para AGENT
 * - /app/viewer para VIEWER
 */
export const ROLE_DASHBOARD_MAP: Record<TenantRole, string> = {
  OWNER: '/app',      // Dashboard principal (todos los roles por ahora)
  ADMIN: '/app',
  AGENT: '/app',      // Dashboard principal
  VIEWER: '/app',    // Dashboard principal
};

/**
 * Obtiene la ruta del dashboard según el rol del usuario
 */
export function getDashboardRoute(role: TenantRole): string {
  return ROLE_DASHBOARD_MAP[role] || ROLE_DASHBOARD_MAP.AGENT;
}

/**
 * Verifica si un rol tiene permisos de administración
 */
export function isAdminRole(role: TenantRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Verifica si un rol puede editar contenido
 */
export function canEdit(role: TenantRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'AGENT';
}

/**
 * Verifica si un rol solo puede ver (read-only)
 */
export function isReadOnly(role: TenantRole): boolean {
  return role === 'VIEWER';
}

/**
 * Obtiene el rol más alto de una lista de roles
 * Orden: OWNER > ADMIN > AGENT > VIEWER
 */
export function getHighestRole(roles: TenantRole[]): TenantRole {
  const roleHierarchy: TenantRole[] = ['OWNER', 'ADMIN', 'AGENT', 'VIEWER'];
  
  for (const role of roleHierarchy) {
    if (roles.includes(role)) {
      return role;
    }
  }
  
  return 'VIEWER'; // Default
}

