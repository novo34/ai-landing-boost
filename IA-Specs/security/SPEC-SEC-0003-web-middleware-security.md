# SPEC-SEC-0003: Re-habilitación del Middleware de Seguridad Next.js - Especificación Técnica

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**PRD Relacionado:** PRD-SEC-0003  
**Prioridad:** P1 (Security)

---

## 1. Diseño Técnico

### 1.1 Arquitectura

#### 1.1.1 Componentes Afectados
```
apps/web/
├── middleware.ts              [RESTAURAR: descomentar código]
├── .env.local                 [OPCIONAL: configurar variables]
└── README.md                  [ACTUALIZAR: documentar variables]
```

### 1.2 Flujo de Ejecución

```
Request → middleware.ts
  ├── Leer hostname del request
  ├── Detectar si es ngrok (hostname.includes('ngrok'))
  ├── SI ES NGROK:
  │   ├── Verificar Basic Auth (si NGROK_AUTH_USER configurado)
  │   │   ├── Si no hay header Authorization → 401
  │   │   ├── Si credenciales incorrectas → 401
  │   │   └── Si credenciales correctas → continuar
  │   ├── Verificar IP allowlist (si NGROK_ALLOWED_IPS configurado)
  │   │   ├── Leer IP del cliente (x-forwarded-for, x-real-ip, request.ip)
  │   │   ├── Si IP no está en lista y no es '*' → 403
  │   │   └── Si IP autorizada o '*' → continuar
  │   └── Agregar headers de seguridad (X-Environment, X-Security-Warning)
  ├── SI ES PRODUCCIÓN:
  │   └── Agregar header X-Environment: production
  └── Retornar NextResponse.next() con headers
```

---

## 2. Detalles de Configuración

### 2.1 Variables de Entorno

#### 2.1.1 NGROK_AUTH_USER (Opcional)
```bash
# .env.local (solo desarrollo)
NGROK_AUTH_USER=admin
```

**Descripción:** Usuario para autenticación básica cuando se accede vía ngrok  
**Requerido:** Solo si se usa ngrok y se quiere proteger con Basic Auth  
**Formato:** String simple (sin espacios)

#### 2.1.2 NGROK_AUTH_PASS (Opcional)
```bash
# .env.local (solo desarrollo)
NGROK_AUTH_PASS=secure-password-123
```

**Descripción:** Contraseña para autenticación básica cuando se accede vía ngrok  
**Requerido:** Solo si `NGROK_AUTH_USER` está configurado  
**Formato:** String simple (sin espacios)  
**Recomendación:** Usar contraseña fuerte incluso en desarrollo

#### 2.1.3 NGROK_ALLOWED_IPS (Opcional)
```bash
# .env.local (solo desarrollo)
NGROK_ALLOWED_IPS=192.168.1.100,10.0.0.50,*
```

**Descripción:** Lista de IPs permitidas para acceder vía ngrok  
**Requerido:** Solo si se quiere restringir acceso por IP  
**Formato:** Coma-separada, sin espacios (o con espacios que se trimmean)  
**Especial:** `*` permite todas las IPs  
**Ejemplo:** `192.168.1.100,10.0.0.50` o `*` para permitir todas

### 2.2 Configuración de Next.js

#### 2.2.1 Matcher del Middleware
```typescript
export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto:
    // - /api/* (manejado por backend)
    // - /_next/static/* (assets estáticos)
    // - /_next/image/* (optimización de imágenes)
    // - /favicon.ico (favicon)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 3. Cambios a Esquema

### 3.1 Base de Datos
**No aplica:** Este cambio no afecta el esquema de base de datos.

### 3.2 Archivos de Código

#### 3.2.1 middleware.ts - Código Restaurado
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { measureSync } from './lib/perf/perfLogger';

/**
 * Middleware de seguridad para Next.js
 * Aplica validaciones de seguridad especialmente para ngrok
 */
export function middleware(request: NextRequest) {
  return measureSync('middleware', () => {
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
      } else {
        // Advertir si ngrok está activo pero no hay credenciales
        console.warn('⚠️ ngrok detectado pero NGROK_AUTH_USER no configurado. Acceso sin autenticación.');
      }
      
      // Verificar lista blanca de IPs si está configurada
      const allowedIPs = process.env.NGROK_ALLOWED_IPS?.split(',').map(ip => ip.trim());
      if (allowedIPs && allowedIPs.length > 0) {
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        request.headers.get('x-real-ip') ||
                        request.ip ||
                        'unknown';
        
        // Si '*' está en la lista, permitir todas las IPs
        if (!allowedIPs.includes('*') && !allowedIPs.includes(clientIP)) {
          console.warn(`⚠️ IP no autorizada intentando acceder: ${clientIP}`);
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
  }, 'SERVER', { path: request.nextUrl.pathname });
}

// Configurar en qué rutas aplicar el middleware
export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto API, assets estáticos e imágenes optimizadas
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

#### 3.2.2 Optimizaciones de Performance

**Cachear validaciones cuando sea posible:**
```typescript
// Cachear detección de ngrok (hostname no cambia durante runtime)
const isNgrok = hostname.includes('ngrok') || 
                hostname.includes('ngrok-free') || 
                hostname.includes('ngrok.io');

// Cachear lista de IPs permitidas (parsear una vez)
const allowedIPs = process.env.NGROK_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [];

// Validar IP solo si lista está configurada
if (allowedIPs.length > 0 && !allowedIPs.includes('*')) {
  // Validación de IP (rápida, O(1) con Set)
  const allowedIPsSet = new Set(allowedIPs);
  if (!allowedIPsSet.has(clientIP)) {
    return new NextResponse('Acceso denegado - IP no autorizada', { status: 403 });
  }
}
```

**Evitar operaciones costosas:**
- No hacer llamadas a APIs externas
- No hacer queries a BD
- Usar operaciones síncronas simples (string matching, Set lookup)

---

## 4. Estrategia de Compatibilidad

### 4.1 Migración
**No requiere migración:** Solo restaurar código comentado.

### 4.2 Compatibilidad Hacia Atrás
- **Frontend:** No requiere cambios, middleware es transparente
- **API:** No afecta, matcher excluye `/api/*`
- **Assets:** No afecta, matcher excluye `/_next/static/*` y `/_next/image/*`

### 4.3 Fallback
- **Si variables no están configuradas:** Middleware funciona pero sin validaciones adicionales
- **Si ngrok no está activo:** Middleware no aplica validaciones de ngrok

---

## 5. Estrategia de Seguridad

### 5.1 Amenazas Identificadas
- **T1:** Aplicación expuesta públicamente sin autenticación
- **T2:** Cualquier IP puede acceder sin restricciones
- **T3:** Headers de seguridad no se aplican

### 5.2 Controles de Seguridad
- **C1:** Basic Auth protege acceso vía ngrok (si configurado)
- **C2:** Lista blanca de IPs restringe acceso (si configurado)
- **C3:** Headers de seguridad identifican entorno
- **C4:** Matcher excluye rutas que no necesitan validación

### 5.3 Defaults Seguros
- **Sin credenciales:** Advertencia en logs pero no bloquea (desarrollo)
- **Sin IPs:** No restringe IPs si no está configurado (desarrollo)
- **Producción:** Headers de seguridad siempre aplicados

---

## 6. Plan de Pruebas

### 6.1 Pruebas Unitarias

#### UT-001: Detección de ngrok
```typescript
describe('Middleware - ngrok detection', () => {
  it('debe detectar hostname de ngrok', () => {
    const request = new NextRequest('https://abc123.ngrok.io', {
      headers: { host: 'abc123.ngrok.io' },
    });
    
    // Mock middleware y verificar que detecta ngrok
    // ...
  });
});
```

#### UT-002: Autenticación Básica
```typescript
describe('Middleware - Basic Auth', () => {
  it('debe requerir autenticación si NGROK_AUTH_USER está configurado', () => {
    process.env.NGROK_AUTH_USER = 'admin';
    process.env.NGROK_AUTH_PASS = 'password';
    
    const request = new NextRequest('https://abc123.ngrok.io', {
      headers: { host: 'abc123.ngrok.io' },
    });
    
    const response = middleware(request);
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('Basic');
  });

  it('debe permitir acceso con credenciales correctas', () => {
    process.env.NGROK_AUTH_USER = 'admin';
    process.env.NGROK_AUTH_PASS = 'password';
    
    const credentials = Buffer.from('admin:password').toString('base64');
    const request = new NextRequest('https://abc123.ngrok.io', {
      headers: {
        host: 'abc123.ngrok.io',
        authorization: `Basic ${credentials}`,
      },
    });
    
    const response = middleware(request);
    expect(response.status).toBe(200);
  });
});
```

#### UT-003: Lista Blanca de IPs
```typescript
describe('Middleware - IP allowlist', () => {
  it('debe bloquear IP no autorizada', () => {
    process.env.NGROK_ALLOWED_IPS = '192.168.1.100,10.0.0.50';
    
    const request = new NextRequest('https://abc123.ngrok.io', {
      headers: {
        host: 'abc123.ngrok.io',
        'x-forwarded-for': '192.168.1.200', // IP no autorizada
      },
    });
    
    const response = middleware(request);
    expect(response.status).toBe(403);
  });

  it('debe permitir IP autorizada', () => {
    process.env.NGROK_ALLOWED_IPS = '192.168.1.100,10.0.0.50';
    
    const request = new NextRequest('https://abc123.ngrok.io', {
      headers: {
        host: 'abc123.ngrok.io',
        'x-forwarded-for': '192.168.1.100', // IP autorizada
      },
    });
    
    const response = middleware(request);
    expect(response.status).toBe(200);
  });

  it('debe permitir todas las IPs si * está en lista', () => {
    process.env.NGROK_ALLOWED_IPS = '*';
    
    const request = new NextRequest('https://abc123.ngrok.io', {
      headers: {
        host: 'abc123.ngrok.io',
        'x-forwarded-for': '1.2.3.4', // Cualquier IP
      },
    });
    
    const response = middleware(request);
    expect(response.status).toBe(200);
  });
});
```

### 6.2 Pruebas de Integración

#### IT-001: Matcher Excluye Rutas Correctas
```typescript
describe('Middleware - Matcher', () => {
  it('debe aplicar a rutas de páginas', async () => {
    const response = await fetch('http://localhost:3000/');
    // Verificar que middleware se ejecutó (headers presentes)
    expect(response.headers.get('X-Environment')).toBeDefined();
  });

  it('NO debe aplicar a /api/*', async () => {
    const response = await fetch('http://localhost:3000/api/health');
    // Verificar que middleware NO se ejecutó
    expect(response.headers.get('X-Environment')).toBeNull();
  });

  it('NO debe aplicar a /_next/static/*', async () => {
    const response = await fetch('http://localhost:3000/_next/static/css/app.css');
    // Verificar que middleware NO se ejecutó
    expect(response.headers.get('X-Environment')).toBeNull();
  });
});
```

#### IT-002: Flujo Completo con ngrok
```typescript
describe('Middleware - ngrok flow', () => {
  it('debe aplicar todas las validaciones para ngrok', async () => {
    process.env.NGROK_AUTH_USER = 'admin';
    process.env.NGROK_AUTH_PASS = 'password';
    process.env.NGROK_ALLOWED_IPS = '192.168.1.100';
    
    // Simular request desde ngrok
    const response = await fetch('https://abc123.ngrok.io/', {
      headers: {
        'x-forwarded-for': '192.168.1.100',
        authorization: `Basic ${Buffer.from('admin:password').toString('base64')}`,
      },
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Environment')).toBe('development-ngrok');
    expect(response.headers.get('X-Security-Warning')).toBeDefined();
  });
});
```

### 6.3 Pruebas de Performance

#### PERF-001: Latencia del Middleware
```typescript
describe('Middleware - Performance', () => {
  it('debe ejecutarse en menos de 10ms (p95)', async () => {
    const times: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await middleware(createRequest());
      const end = performance.now();
      times.push(end - start);
    }
    
    times.sort((a, b) => a - b);
    const p95 = times[94]; // Percentil 95
    
    expect(p95).toBeLessThan(10); // Menos de 10ms
  });
});
```

---

## 7. Checklist de Verificación

### 7.1 Pre-Implementación
- [ ] Verificar que código comentado existe en `middleware.ts`
- [ ] Verificar que matcher está vacío actualmente
- [ ] Backup del archivo actual (opcional)

### 7.2 Implementación
- [ ] Descomentar código de seguridad (líneas 21-90)
- [ ] Eliminar comentarios temporales de diagnóstico
- [ ] Configurar matcher correctamente
- [ ] Optimizar validaciones (cachear cuando sea posible)
- [ ] Agregar logs de advertencia si ngrok sin credenciales

### 7.3 Configuración
- [ ] Documentar variables de entorno opcionales
- [ ] Crear `.env.example` con ejemplos (si no existe)
- [ ] Actualizar README con instrucciones

### 7.4 Validación
- [ ] Probar acceso local (sin ngrok) - debe funcionar normalmente
- [ ] Probar acceso vía ngrok sin credenciales - debe advertir o bloquear
- [ ] Probar acceso vía ngrok con credenciales - debe permitir
- [ ] Probar acceso desde IP no autorizada - debe bloquear (si configurado)
- [ ] Probar acceso desde IP autorizada - debe permitir
- [ ] Verificar que `/api/*` no pasa por middleware
- [ ] Verificar que `/_next/static/*` no pasa por middleware
- [ ] Medir latencia del middleware (< 10ms)

### 7.5 Comandos de Verificación

```bash
# Verificar que middleware se ejecuta
curl -I http://localhost:3000/

# Verificar headers de seguridad
curl -I http://localhost:3000/ | grep X-Environment

# Probar Basic Auth (si configurado)
curl -u admin:password http://localhost:3000/

# Verificar que /api no pasa por middleware
curl -I http://localhost:3000/api/health | grep X-Environment
# (no debe aparecer X-Environment)
```

---

## 8. Plan de Rollback

### 8.1 Escenario: Performance Degradado
**Síntomas:** Latencia del middleware > 10ms o tiempo de carga de páginas aumenta significativamente

**Acción:**
1. Revertir cambios en `middleware.ts` (git revert)
2. Comentar código nuevamente
3. Investigar causa del problema
4. Optimizar y reintentar

### 8.2 Escenario: Bloqueo de Acceso Legítimo
**Síntomas:** Usuarios legítimos no pueden acceder (IP bloqueada, credenciales incorrectas)

**Acción:**
1. Verificar configuración de `NGROK_ALLOWED_IPS` y `NGROK_AUTH_USER/PASS`
2. Ajustar configuración si es necesario
3. Si persiste, deshabilitar temporalmente validaciones específicas
4. Investigar y corregir

### 8.3 Escenario: Rutas Bloqueadas Incorrectamente
**Síntomas:** Rutas que deberían funcionar están bloqueadas

**Acción:**
1. Verificar matcher (puede estar aplicando a rutas incorrectas)
2. Ajustar patrón del matcher
3. Probar y validar

---

## 9. Referencias Técnicas

### 9.1 Documentación
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Matcher](https://nextjs.org/docs/app/api-reference/next-config-js/middleware#matcher)
- [HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#basic_authentication_scheme)

### 9.2 Archivos Relacionados
- `apps/web/middleware.ts`
- `apps/web/.env.local` (opcional)
- `apps/web/README.md`

---

## 10. Notas de Implementación

### 10.1 Orden de Ejecución
1. **Primero:** Descomentar código de seguridad
2. **Segundo:** Configurar matcher correctamente
3. **Tercero:** Optimizar validaciones
4. **Cuarto:** Probar en desarrollo
5. **Quinto:** Medir performance y ajustar si es necesario

### 10.2 Puntos Críticos
- ⚠️ **NO aplicar middleware a `/api/*`** - Backend maneja su propia autenticación
- ⚠️ **NO aplicar middleware a assets estáticos** - Causa problemas de performance
- ⚠️ **Validar IPs correctamente** - Considerar proxies y headers `x-forwarded-for`
- ⚠️ **Medir performance** - Asegurar que no causa lentitud

### 10.3 Comunicación al Equipo
- Notificar que middleware está restaurado
- Proporcionar instrucciones de configuración de variables opcionales
- Documentar cómo acceder vía ngrok con autenticación

---

**Fin de la SPEC**

