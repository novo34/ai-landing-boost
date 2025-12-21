/**
 * Feature flags para deshabilitar providers/componentes en desarrollo
 * Útil para diagnosticar cuellos de botella de rendimiento
 * 
 * Solo funciona en development (NODE_ENV === 'development')
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Feature flags para deshabilitar providers
 * Configurar en .env.local:
 * 
 * PERF_DISABLE_I18N_PROVIDER=true
 * PERF_DISABLE_TOASTER=true
 * PERF_DISABLE_ANALYTICS=true
 * PERF_DISABLE_COOKIE_CONSENT=true
 */

export const PERF_FLAGS = {
  DISABLE_I18N_PROVIDER: isDev && process.env.PERF_DISABLE_I18N_PROVIDER === 'true',
  DISABLE_TOASTER: isDev && process.env.PERF_DISABLE_TOASTER === 'true',
  DISABLE_SONNER: isDev && process.env.PERF_DISABLE_SONNER === 'true',
  DISABLE_COOKIE_CONSENT: isDev && process.env.PERF_DISABLE_COOKIE_CONSENT === 'true',
  DISABLE_ANALYTICS: isDev && process.env.PERF_DISABLE_ANALYTICS === 'true',
} as const;

/**
 * Log de flags activos (solo en dev)
 */
if (isDev) {
  const activeFlags = Object.entries(PERF_FLAGS)
    .filter(([_, value]) => value)
    .map(([key]) => key);
  
  if (activeFlags.length > 0) {
    console.log('[PERF] Feature flags activos:', activeFlags);
  }
}
