# AI-SPEC-06: Corrección de Guards y Configuración CORS

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-06  
> **Prioridad:** 🔴 CRÍTICA

---

## Árbol de Archivos a Modificar

```
ai-landing-boost/
└── apps/
    └── api/
        └── src/
            ├── modules/
            │   └── auth/
            │       └── guards/
            │           └── jwt-auth.guard.ts  [MODIFICAR]
            └── main.ts                         [MODIFICAR]
```

---

## Pasos Exactos de Ejecución

### Paso 1: Mejorar JwtAuthGuard

**Archivo:** `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`

**Acción:** Reemplazar contenido completo

**Código:**
```typescript
import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
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
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      this.logger.debug(
        `✅ Public route accessed: ${request.method} ${request.url}`
      );
      return true;
    }

    // Ruta protegida - requiere autenticación
    const request = context.switchToHttp().getRequest();
    this.logger.debug(
      `🔒 Protected route accessed: ${request.method} ${request.url}`
    );

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    if (err || !user) {
      const errorMessage = info?.message || err?.message || 'Authentication failed';
      this.logger.warn(
        `❌ Authentication failed for ${request.method} ${request.url}: ${errorMessage}`
      );
      
      throw err || new UnauthorizedException({
        success: false,
        error_key: 'auth.unauthorized',
        error_params: { message: errorMessage },
      });
    }

    this.logger.debug(`✅ Authenticated user: ${user.email || user.userId}`);
    return user;
  }
}
```

---

### Paso 2: Mejorar Configuración CORS

**Archivo:** `apps/api/src/main.ts`

**Acción:** Reemplazar sección de CORS

**Código a Reemplazar:**
```typescript
// CORS: Configuración estricta para producción
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
      console.warn('❌ Request without origin rejected (production mode)');
      return callback(new Error('Origin required in production'));
    }

    // Verificar si el origin está permitido
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      console.warn(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      console.warn(`💡 Configure FRONTEND_URL in .env to allow this origin`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  exposedHeaders: ['x-tenant-id'],
});
```

**Ubicación:** Reemplazar la sección completa de `app.enableCors()` existente.

---

### Paso 3: Agregar Logging de Inicio

**Archivo:** `apps/api/src/main.ts`

**Acción:** Mejorar logging al final de bootstrap()

**Código a Agregar/Modificar:**
```typescript
const port = process.env.PORT || 3001;
await app.listen(port);

const url = await app.getUrl();
console.log('');
console.log('========================================');
console.log('  ✅ API is running');
console.log('========================================');
console.log(`  URL: ${url}`);
console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`  CORS enabled for: ${allowedOrigins.join(', ')}`);
console.log('========================================');
console.log('');
```

---

## Código Sugerido/Reemplazos

### Validación de Rutas Públicas (Opcional)

**Archivo:** `apps/api/src/common/validators/public-routes.validator.ts`

**Acción:** Crear archivo nuevo (opcional, para documentación)

**Código:**
```typescript
/**
 * Lista de rutas públicas que NO requieren autenticación
 * 
 * IMPORTANTE: Estas rutas deben estar marcadas con @Public()
 * en sus respectivos controllers.
 */
export const PUBLIC_ROUTES = [
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/refresh',
  'GET /marketing-leads',
  'POST /marketing-leads',
] as const;

export type PublicRoute = typeof PUBLIC_ROUTES[number];
```

---

## Condiciones Previas

1. ✅ SPEC-02 completado (variables de entorno configuradas)
2. ✅ `FRONTEND_URL` configurada en `.env`
3. ✅ Decorador `@Public()` existe y funciona

---

## Tests Automatizables

### Test 1: Verificar Rutas Públicas

```typescript
// tests/auth/public-routes.spec.ts
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('JwtAuthGuard - Public Routes', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  it('should allow public routes', () => {
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/auth/login' }),
      }),
    };

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = guard.canActivate(context as any);
    expect(result).toBe(true);
  });
});
```

### Test 2: Verificar CORS

```typescript
// tests/cors/cors.spec.ts
describe('CORS Configuration', () => {
  it('should allow configured origins', () => {
    const allowedOrigins = ['http://localhost:3000'];
    const origin = 'http://localhost:3000';
    expect(allowedOrigins.includes(origin)).toBe(true);
  });

  it('should block unconfigured origins', () => {
    const allowedOrigins = ['http://localhost:3000'];
    const origin = 'http://malicious.com';
    expect(allowedOrigins.includes(origin)).toBe(false);
  });
});
```

---

## Notas para Compliance

- ✅ **Seguridad:** Guards protegen rutas correctamente
- ✅ **CORS:** Configuración estricta previene ataques
- ✅ **Cookies:** CORS con credentials permite cookies HttpOnly
- ✅ **GDPR:** No afecta directamente
- ✅ **Tenants:** No afecta directamente

---

## Validación Post-Implementación

1. Rutas públicas funcionan sin autenticación:
   - `POST /auth/register` - debe funcionar
   - `POST /auth/login` - debe funcionar
   - `GET /marketing-leads` - debe funcionar

2. Rutas protegidas requieren autenticación:
   - `GET /users/me` - debe requerir token
   - `GET /tenants/settings` - debe requerir token

3. CORS permite requests del frontend:
   - Frontend en localhost:3000 puede hacer requests
   - Logs muestran origins permitidos

4. Logging funciona:
   - Logs muestran rutas públicas accedidas
   - Logs muestran rutas protegidas accedidas
   - Logs muestran errores de autenticación

---

## Orden de Ejecución

Este SPEC debe ejecutarse **SEXTO**, después de SPEC-05, como último fix crítico antes de la validación completa.

---

## Troubleshooting

### Problema: Rutas públicas bloqueadas

**Solución:**
1. Verificar que `@Public()` está aplicado al método/controller
2. Verificar que el decorador se importa correctamente
3. Verificar logs - deben mostrar "Public route accessed"

### Problema: CORS bloquea requests

**Solución:**
1. Verificar `FRONTEND_URL` en `.env`
2. Verificar que el origin del frontend coincide exactamente
3. Verificar logs - deben mostrar el origin bloqueado
4. En desarrollo, verificar que `NODE_ENV !== 'production'`

