/**
 * Lista de rutas públicas que NO requieren autenticación
 * 
 * IMPORTANTE: Estas rutas deben estar marcadas con @Public()
 * en sus respectivos controllers.
 * 
 * Esta lista es solo para documentación y referencia.
 * La protección real se hace mediante el decorador @Public()
 * y el JwtAuthGuard.
 */
export const PUBLIC_ROUTES = [
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/refresh',
  'GET /billing/plans',
  'POST /public/marketing/leads',
] as const;

export type PublicRoute = typeof PUBLIC_ROUTES[number];

/**
 * Verifica si una ruta está en la lista de rutas públicas
 * (Solo para referencia, no se usa en la lógica de autenticación)
 */
export function isPublicRoute(method: string, path: string): boolean {
  const route = `${method} ${path}`;
  return PUBLIC_ROUTES.includes(route as PublicRoute);
}

