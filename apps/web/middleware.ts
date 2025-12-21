import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { measureSync } from './lib/perf/perfLogger';

/**
 * Middleware de seguridad para Next.js
 * Aplica validaciones de seguridad especialmente para ngrok
 */

// ⚠️ MIDDLEWARE COMENTADO PARA PRUEBAS DE RENDIMIENTO - PASO 2 DEL DIAGNÓSTICO
// Si la página mejora con esto comentado, el middleware es el problema
// Para restaurar: copia el contenido de middleware.ts.backup

export function middleware(request: NextRequest) {
  return measureSync('middleware', () => {
    // MIDDLEWARE COMENTADO TEMPORALMENTE PARA DIAGNÓSTICO
    // Descomentar después de probar si no es el problema
    return NextResponse.next();
  }, 'SERVER', { path: request.nextUrl.pathname });
  
  /* COMENTADO PARA PRUEBAS:
  const hostname = request.headers.get('host') || '';
  const isNgrok = hostname.includes('ngrok') || 
                  hostname.includes('ngrok-free') || 
                  hostname.includes('ngrok.io');
  
  // Si estamos usando ngrok, aplicar validaciones de seguridad
  if (isNgrok) {
    // Verificar autenticación básica si está configurada
    const authUser = process.env.NGROK_AUTH_USER;
    const authPass = process.env.NGROK_AUTH_PASS;
    
    if (authUser && authPass) {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new NextResponse('Autenticación requerida', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Acceso restringido - Desarrollo"',
          },
        });
      }
      
      // Decodificar y verificar credenciales
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
      const [user, pass] = credentials.split(':');
      
      if (user !== authUser || pass !== authPass) {
        return new NextResponse('Credenciales inválidas', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Acceso restringido - Desarrollo"',
          },
        });
      }
    }
    
    // Verificar lista blanca de IPs si está configurada
    const allowedIPs = process.env.NGROK_ALLOWED_IPS?.split(',').map(ip => ip.trim());
    if (allowedIPs && allowedIPs.length > 0) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      request.ip ||
                      'unknown';
      
      if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('*')) {
        return new NextResponse('Acceso denegado - IP no autorizada', {
          status: 403,
        });
      }
    }
    
    // Agregar headers de seguridad adicionales para ngrok
    const response = NextResponse.next();
    response.headers.set('X-Environment', 'development-ngrok');
    response.headers.set('X-Security-Warning', 'Este es un entorno de desarrollo expuesto públicamente');
    
    return response;
  }
  
  // Para producción, aplicar headers de seguridad estándar
  if (process.env.NODE_ENV === 'production') {
    const response = NextResponse.next();
    response.headers.set('X-Environment', 'production');
    return response;
  }
  
  return NextResponse.next();
  */
}

// ⚠️ MIDDLEWARE DESHABILITADO TEMPORALMENTE PARA DIAGNÓSTICO
// Configurar en qué rutas aplicar el middleware
// Comentado para evitar errores de compilación durante pruebas
export const config = {
  matcher: [
    // Deshabilitado temporalmente - no aplicar a ninguna ruta
    // '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
