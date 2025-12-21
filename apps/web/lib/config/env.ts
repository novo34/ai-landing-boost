/**
 * Configuración y validación de variables de entorno
 * Detecta automáticamente el entorno (desarrollo/producción)
 * y aplica validaciones de seguridad
 */

export type Environment = 'development' | 'production' | 'test';

/**
 * Detecta el entorno actual
 */
export function getEnvironment(): Environment {
  // En Next.js, NODE_ENV puede ser 'development', 'production', o 'test'
  const nodeEnv = process.env.NODE_ENV as Environment;
  
  // Verificar también VERCEL_ENV si está disponible (despliegue en Vercel)
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV as Environment;
  }
  
  // Verificar si estamos en un entorno de producción basado en la URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Si no es localhost ni una IP local, probablemente es producción
    if (hostname !== 'localhost' && 
        hostname !== '127.0.0.1' && 
        !hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
      // Pero verificar si es ngrok (desarrollo con túnel)
      if (hostname.includes('ngrok') || hostname.includes('ngrok-free') || hostname.includes('ngrok.io')) {
        return 'development'; // ngrok siempre es desarrollo
      }
      // Si no es ngrok y no es local, es producción
      return nodeEnv || 'production';
    }
  }
  
  return nodeEnv || 'development';
}

/**
 * Verifica si estamos en desarrollo
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Verifica si estamos en producción
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Verifica si estamos usando ngrok (túnel de desarrollo)
 */
export function isNgrok(): boolean {
  if (typeof window === 'undefined') {
    // En el servidor, verificar la variable de entorno
    return !!process.env.NEXT_PUBLIC_NGROK_URL || 
           process.env.VERCEL_URL?.includes('ngrok') ||
           false;
  }
  
  const hostname = window.location.hostname;
  return hostname.includes('ngrok') || 
         hostname.includes('ngrok-free') || 
         hostname.includes('ngrok.io');
}

/**
 * Obtiene la URL base de la API según el entorno
 */
export function getApiBaseUrl(): string {
  const env = getEnvironment();
  const isNgrokEnv = isNgrok();
  
  // Si estamos usando ngrok, usar el proxy
  if (isNgrokEnv && process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  
  // En producción, usar la URL configurada o el proxy
  if (env === 'production') {
    return process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '';
  }
  
  // En desarrollo local, usar localhost o el proxy si está configurado
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  
  return 'http://localhost:3001';
}

/**
 * Validación de seguridad para ngrok
 */
export function validateNgrokSecurity(): {
  isSecure: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const isNgrokEnv = isNgrok();
  
  if (!isNgrokEnv) {
    return { isSecure: true, warnings: [] };
  }
  
  // Advertencias de seguridad para ngrok
  warnings.push('⚠️ Estás usando ngrok (túnel de desarrollo)');
  warnings.push('⚠️ El sistema está expuesto públicamente');
  
  // Verificar si hay autenticación básica configurada
  if (!process.env.NGROK_AUTH_USER || !process.env.NGROK_AUTH_PASS) {
    warnings.push('⚠️ No hay autenticación básica configurada para ngrok');
    warnings.push('⚠️ Cualquiera con la URL puede acceder al sistema');
  }
  
  // Verificar si hay lista blanca de IPs
  if (!process.env.NGROK_ALLOWED_IPS) {
    warnings.push('⚠️ No hay lista de IPs permitidas configurada');
  }
  
  return {
    isSecure: warnings.length === 2, // Solo las advertencias básicas
    warnings,
  };
}

/**
 * Valida las variables de entorno requeridas
 */
export function validateEnv(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = getEnvironment();
  
  // Validar BACKEND_INTERNAL_URL (requerido para el proxy)
  if (process.env.NEXT_PUBLIC_API_BASE && !process.env.BACKEND_INTERNAL_URL) {
    warnings.push('BACKEND_INTERNAL_URL no está configurado (requerido para el proxy)');
  }
  
  // Validar formato de URLs
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_API_URL);
    } catch {
      errors.push('NEXT_PUBLIC_API_URL no es una URL válida');
    }
  }
  
  if (process.env.BACKEND_INTERNAL_URL) {
    try {
      new URL(process.env.BACKEND_INTERNAL_URL);
    } catch {
      errors.push('BACKEND_INTERNAL_URL no es una URL válida');
    }
  }
  
  // Validaciones de seguridad para ngrok
  if (isNgrok()) {
    const security = validateNgrokSecurity();
    warnings.push(...security.warnings);
  }
  
  // Advertencias para producción
  if (env === 'production') {
    if (!process.env.NEXT_PUBLIC_API_BASE && !process.env.NEXT_PUBLIC_API_URL) {
      warnings.push('No hay URL de API configurada para producción');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validar en desarrollo
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  const validation = validateEnv();
  if (validation.errors.length > 0) {
    console.error('❌ Errores de configuración:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Advertencias de configuración:', validation.warnings);
  }
}
