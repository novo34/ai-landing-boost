# PRD-06: Corrección de Guards y Configuración CORS

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente

---

## Problema Detectado

El guard global JWT puede bloquear rutas públicas si el decorador `@Public()` no se aplica correctamente. La configuración de CORS es muy estricta y puede bloquear requests legítimos sin logging adecuado.

## Impacto en el SaaS

- **Crítico:** Rutas públicas (landing, registro, login) pueden estar bloqueadas
- API completamente inaccesible sin autenticación
- Desarrollo local puede fallar por CORS
- Difícil debuggear problemas de autenticación

## Causa Raíz

1. El guard global se aplica a todas las rutas y depende de `@Public()` para permitir acceso
2. CORS no tiene logging ni fallbacks adecuados para desarrollo
3. No hay validación de que las rutas públicas estén correctamente marcadas

## Requisitos Funcionales

### RF-01: Guard Global Robusto
- Verificar correctamente el decorador `@Public()`
- Logging de rutas bloqueadas para debugging
- Manejo de errores claro

### RF-02: CORS Mejorado
- Logging de requests bloqueados
- Fallbacks para desarrollo
- Configuración clara por entorno

### RF-03: Validación de Rutas Públicas
- Verificar que todas las rutas públicas están marcadas
- Test automatizado de rutas públicas
- Documentación de qué rutas son públicas

## Requisitos Técnicos

### RT-01: Guard Mejorado
```typescript
// apps/api/src/modules/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug(`Public route accessed: ${context.getHandler().name}`);
      return true;
    }

    // Log para debugging
    const request = context.switchToHttp().getRequest();
    this.logger.debug(
      `Protected route accessed: ${request.method} ${request.url}`
    );

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`Authentication failed: ${info?.message || err?.message}`);
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
```

### RT-02: CORS Mejorado
```typescript
// apps/api/src/main.ts
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = frontendUrl.split(',').map((url) => url.trim());

app.enableCors({
  origin: (origin, callback) => {
    // Permitir requests sin origin en desarrollo
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Request without origin allowed (development mode)');
        return callback(null, true);
      }
      return callback(new Error('Origin required in production'));
    }

    // Verificar si el origin está permitido
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      console.warn(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  exposedHeaders: ['x-tenant-id'],
});
```

### RT-03: Validación de Rutas Públicas
```typescript
// apps/api/src/common/validators/public-routes.validator.ts
export const PUBLIC_ROUTES = [
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/refresh',
  'GET /marketing-leads',
  'POST /marketing-leads',
] as const;

// Test para verificar que las rutas están marcadas
// tests/auth/public-routes.spec.ts
```

## Criterios de Aceptación QA

- [ ] Rutas públicas funcionan sin autenticación
- [ ] Rutas protegidas requieren autenticación
- [ ] CORS permite requests del frontend
- [ ] Logging de requests bloqueados funciona
- [ ] Desarrollo local funciona sin problemas de CORS
- [ ] Tests de rutas públicas pasan
- [ ] Documentación de rutas públicas está actualizada

## Consideraciones de Seguridad

- **Crítico:** No permitir rutas públicas sin marcar correctamente
- Validar que CORS no permite origins maliciosos
- Logging no debe exponer información sensible
- En producción, CORS debe ser estricto

## Dependencias

- PRD-02 (variables de entorno) - FRONTEND_URL debe estar configurada

## Referencias

- IA-Specs/04-seguridad-y-compliance.mdc
- IA-Specs/06-backend-standards.mdc
- NestJS Guards documentation

