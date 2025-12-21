# Auditoría Técnica Completa - SaaS AutomAI

> **Fecha:** 2025-01-XX  
> **Versión:** 1.0  
> **Estado:** 🔴 CRÍTICO - Sistema no inicia correctamente

---

## Resumen Ejecutivo

El sistema SaaS AutomAI presenta **múltiples problemas críticos** que impiden su inicio correcto en local. Se han identificado **12 problemas críticos**, **8 problemas mayores** y **5 problemas menores** que requieren atención inmediata.

### Problemas Críticos Detectados

1. ❌ **Configuración incorrecta del monorepo** - package.json raíz con Vite en lugar de pnpm workspace
2. ❌ **Falta archivo .env.example** - No hay documentación de variables de entorno
3. ❌ **Scripts de inicio usan npm en lugar de pnpm** - Inconsistencia con el monorepo
4. ❌ **i18n con imports dinámicos problemáticos** - Puede romper el build de Next.js
5. ❌ **Prisma Client no generado** - Falta ejecutar `prisma generate`
6. ❌ **Variables de entorno no documentadas** - Backend y frontend requieren vars no documentadas
7. ❌ **Next.js config incompleta** - Falta configuración crítica
8. ❌ **CORS puede bloquear requests** - Configuración estricta sin fallbacks
9. ❌ **Guard global puede bloquear rutas públicas** - Verificación de @Public() puede fallar
10. ❌ **Cliente API usa sessionStorage sin verificación** - Puede causar errores en SSR
11. ❌ **Falta configuración de TypeScript paths** - Imports pueden fallar
12. ❌ **Falta validación de migraciones Prisma** - No se verifica si están aplicadas

---

## 1. Estructura del Monorepo

### 1.1 Problema: Configuración Incorrecta del package.json Raíz

**Severidad:** 🔴 CRÍTICA

**Descripción:**
El `package.json` en la raíz del proyecto está configurado para un proyecto Vite/React, no para un monorepo con pnpm.

**Evidencia:**
```json
// package.json (raíz)
{
  "name": "vite_react_shadcn_ts",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

**Impacto:**
- Los scripts del monorepo no funcionan correctamente
- pnpm workspace puede no reconocer las apps
- Dependencias duplicadas o mal resueltas

**Causa Raíz:**
El proyecto fue migrado de Vite a monorepo pero el package.json raíz no se actualizó.

---

### 1.2 Problema: Scripts de Inicio Usan npm

**Severidad:** 🔴 CRÍTICA

**Descripción:**
Los scripts `start-backend.ps1` y `start-frontend.ps1` usan `npm` en lugar de `pnpm`.

**Evidencia:**
```powershell
# start-backend.ps1
npm run start:dev  # ❌ Debería ser pnpm

# start-frontend.ps1
npm run dev  # ❌ Debería ser pnpm
```

**Impacto:**
- Inconsistencia con el gestor de paquetes del monorepo
- Posibles problemas de resolución de dependencias
- No aprovecha las ventajas de pnpm (hard links, espacio en disco)

---

## 2. Configuración de Next.js

### 2.1 Problema: next.config.ts Incompleto

**Severidad:** 🔴 CRÍTICA

**Descripción:**
El archivo `next.config.ts` está prácticamente vacío, faltan configuraciones críticas.

**Evidencia:**
```typescript
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  /* config options here */
}
```

**Configuraciones Faltantes:**
- Variables de entorno públicas
- Configuración de imágenes
- Headers de seguridad
- Rewrites/Redirects para API
- Configuración de i18n
- Optimizaciones de build

**Impacto:**
- Variables de entorno no disponibles en el cliente
- Problemas con imágenes
- Falta de headers de seguridad
- i18n puede no funcionar correctamente

---

### 2.2 Problema: i18n con Imports Dinámicos Problemáticos

**Severidad:** 🔴 CRÍTICA

**Descripción:**
El sistema de i18n usa imports dinámicos que pueden fallar en el build de Next.js.

**Evidencia:**
```typescript
// apps/web/lib/i18n/index.ts
const translations = await import(`./locales/${locale}/${namespace}.json`);
```

**Problemas:**
- Next.js requiere que los imports dinámicos sean estáticos en tiempo de build
- Los paths dinámicos pueden no ser resueltos correctamente
- Puede causar errores en producción

**Impacto:**
- Build de Next.js puede fallar
- Traducciones no se cargan correctamente
- Errores en runtime

---

## 3. Configuración de NestJS

### 3.1 Problema: Variables de Entorno No Documentadas

**Severidad:** 🔴 CRÍTICA

**Descripción:**
El backend requiere múltiples variables de entorno que no están documentadas en ningún `.env.example`.

**Variables Requeridas (detectadas en código):**
- `DATABASE_URL` - Conexión a MySQL
- `JWT_SECRET` - Secreto para JWT (crítico)
- `JWT_REFRESH_SECRET` - Secreto para refresh tokens
- `JWT_EXPIRES_IN` - Expiración de access token (default: '15m')
- `JWT_REFRESH_EXPIRES_IN` - Expiración de refresh token (default: '7d')
- `FRONTEND_URL` - URL del frontend para CORS
- `PORT` - Puerto del servidor (default: 3001)
- `NODE_ENV` - Entorno (development/production)
- `BCRYPT_ROUNDS` - Rondas de bcrypt (default: 12)

**Impacto:**
- Backend no puede iniciar sin estas variables
- Desarrolladores no saben qué configurar
- Valores por defecto inseguros (JWT_SECRET)

---

### 3.2 Problema: Guard Global Puede Bloquear Rutas Públicas

**Severidad:** 🔴 CRÍTICA

**Descripción:**
El `JwtAuthGuard` global puede fallar al verificar rutas públicas si el decorador `@Public()` no se aplica correctamente.

**Evidencia:**
```typescript
// apps/api/src/main.ts
app.useGlobalGuards(new JwtAuthGuard(reflector));

// apps/api/src/modules/auth/guards/jwt-auth.guard.ts
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
]);
```

**Problemas Potenciales:**
- Si `@Public()` no se aplica correctamente, todas las rutas requieren autenticación
- Rutas de marketing (landing) pueden estar bloqueadas
- Error en la verificación puede causar 401 en rutas públicas

**Impacto:**
- Landing page no funciona
- Registro/login bloqueados
- API completamente inaccesible sin autenticación

---

### 3.3 Problema: CORS Configuración Estricta Sin Fallbacks

**Severidad:** 🟡 MAYOR

**Descripción:**
La configuración de CORS es muy estricta y puede bloquear requests legítimos.

**Evidencia:**
```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: (origin, callback) => {
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

**Problemas:**
- Si `FRONTEND_URL` no está configurado, solo permite localhost:3000
- Requests desde diferentes puertos son bloqueados
- No hay logging de requests bloqueados

**Impacto:**
- Desarrollo local puede fallar si el puerto cambia
- Difícil debuggear problemas de CORS

---

## 4. Configuración de Prisma y Base de Datos

### 4.1 Problema: Prisma Client No Generado

**Severidad:** 🔴 CRÍTICA

**Descripción:**
No hay evidencia de que `prisma generate` se haya ejecutado después de cambios en el schema.

**Evidencia:**
- No hay script en package.json para generar Prisma Client
- No hay verificación en el código de que el cliente esté generado
- El output path en schema.prisma es `../node_modules/.prisma/client`

**Impacto:**
- Backend no puede iniciar si Prisma Client no está generado
- Tipos TypeScript no están disponibles
- Imports de `@prisma/client` fallan

---

### 4.2 Problema: Migraciones No Validadas

**Severidad:** 🟡 MAYOR

**Descripción:**
No hay verificación de que las migraciones de Prisma estén aplicadas antes de iniciar el servidor.

**Evidencia:**
- No hay script de verificación de migraciones
- No hay error handling si la BD no está actualizada
- El servidor puede iniciar con schema desactualizado

**Impacto:**
- Errores en runtime si el schema no coincide
- Difícil detectar problemas de migración
- Puede causar corrupción de datos

---

### 4.3 Problema: DATABASE_URL No Documentada

**Severidad:** 🔴 CRÍTICA

**Descripción:**
La variable `DATABASE_URL` es crítica pero no está documentada.

**Formato Esperado:**
```
mysql://user:password@host:port/database
```

**Impacto:**
- Backend no puede conectarse a la BD
- Prisma no puede ejecutar queries
- Sistema completamente inoperativo

---

## 5. Variables de Entorno

### 5.1 Problema: Falta .env.example

**Severidad:** 🔴 CRÍTICA

**Descripción:**
No existe ningún archivo `.env.example` en el proyecto.

**Impacto:**
- Desarrolladores no saben qué variables configurar
- No hay documentación de valores esperados
- Configuración inconsistente entre entornos

**Variables que Deberían Documentarse:**

**Backend (apps/api/.env.example):**
```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/automai

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Security
BCRYPT_ROUNDS=12
```

**Frontend (apps/web/.env.example):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

### 5.2 Problema: Variables de Entorno con Valores por Defecto Inseguros

**Severidad:** 🔴 CRÍTICA

**Descripción:**
Varias variables de entorno tienen valores por defecto inseguros o de desarrollo.

**Evidencia:**
```typescript
// apps/api/src/modules/auth/auth.module.ts
secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// apps/api/src/modules/auth/strategies/jwt.strategy.ts
secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
```

**Impacto:**
- Si `JWT_SECRET` no está configurado, usa un valor inseguro conocido
- Tokens pueden ser falsificados
- Seguridad comprometida en producción

---

## 6. Módulos de Auth

### 6.1 Problema: Cliente API Usa sessionStorage en SSR

**Severidad:** 🟡 MAYOR

**Descripción:**
El cliente API accede a `sessionStorage` sin verificar si está en el cliente.

**Evidencia:**
```typescript
// apps/web/lib/api/client.ts
const tenantId = typeof window !== 'undefined' ? sessionStorage.getItem('currentTenantId') : null;
```

**Problema:**
Aunque hay verificación de `window`, el código puede ejecutarse en SSR y causar problemas.

**Impacto:**
- Errores en SSR de Next.js
- Hydration mismatches
- Problemas en build time

---

### 6.2 Problema: Cookies HttpOnly - Verificación de Envío

**Severidad:** 🟡 MAYOR

**Descripción:**
No hay verificación de que las cookies HttpOnly se estén enviando correctamente.

**Problemas Potenciales:**
- CORS puede bloquear cookies si `credentials: 'include'` no está configurado
- SameSite puede bloquear cookies en algunos navegadores
- Secure flag puede causar problemas en desarrollo

**Impacto:**
- Autenticación puede fallar silenciosamente
- Difícil debuggear problemas de cookies
- Usuarios no pueden iniciar sesión

---

## 7. TenantContextGuard

### 7.1 Problema: Guard Requiere Usuario Autenticado

**Severidad:** 🟡 MAYOR

**Descripción:**
El `TenantContextGuard` requiere que el usuario esté autenticado, pero algunas rutas pueden necesitar tenant sin autenticación.

**Evidencia:**
```typescript
// apps/api/src/common/guards/tenant-context.guard.ts
if (!user) {
  throw new ForbiddenException({
    success: false,
    error_key: 'auth.unauthorized',
  });
}
```

**Impacto:**
- Rutas públicas que necesitan tenant_id no funcionan
- Marketing leads pueden requerir tenant pero no autenticación

---

## 8. Cliente API en Frontend

### 8.1 Problema: Manejo de Errores Incompleto

**Severidad:** 🟡 MAYOR

**Descripción:**
El cliente API no maneja todos los casos de error posibles.

**Problemas:**
- No hay retry logic para errores de red
- No hay timeout configurado
- Errores 500+ no se manejan específicamente
- No hay logging estructurado

**Impacto:**
- UX pobre en caso de errores
- Difícil debuggear problemas
- Usuarios ven errores genéricos

---

## 9. i18n

### 9.1 Problema: Imports Dinámicos en Next.js

**Severidad:** 🔴 CRÍTICA

**Descripción:**
Los imports dinámicos de traducciones pueden fallar en el build de Next.js.

**Solución Requerida:**
- Usar imports estáticos o
- Configurar Next.js para permitir imports dinámicos o
- Usar un sistema de i18n compatible con Next.js App Router

**Impacto:**
- Build puede fallar
- Traducciones no se cargan
- Sistema completamente inoperativo

---

### 9.2 Problema: Falta Namespace 'common' en Algunos Casos

**Severidad:** 🟢 MENOR

**Descripción:**
Algunos componentes usan `useTranslation('common')` pero las traducciones pueden no estar en el namespace correcto.

**Evidencia:**
```typescript
// apps/web/app/app/settings/page.tsx
const { t } = useTranslation('common');
// Pero las claves usadas son 'settings.*' y 'errors.*'
```

**Impacto:**
- Traducciones no se encuentran
- Textos en inglés o claves sin traducir

---

## 10. TypeScript

### 10.1 Problema: Configuración de Paths Incompleta

**Severidad:** 🟡 MAYOR

**Descripción:**
La configuración de paths en tsconfig puede no cubrir todos los casos.

**Evidencia:**
```json
// apps/web/tsconfig.json
"paths": {
  "@/*": ["./*"]
}
```

**Problemas Potenciales:**
- Imports pueden fallar si la estructura cambia
- No hay validación de paths en build time
- Puede causar errores en producción

---

## 11. Dependencias

### 11.1 Problema: Falta next-i18next o Alternativa

**Severidad:** 🟡 MAYOR

**Descripción:**
El sistema de i18n está implementado manualmente, pero Next.js tiene mejores alternativas.

**Recomendación:**
- Usar `next-intl` (recomendado para App Router) o
- Mejorar la implementación actual para ser compatible con App Router

**Impacto:**
- Mantenimiento más complejo
- Posibles problemas de compatibilidad
- Funcionalidades limitadas

---

## 12. Scripts y Automatización

### 12.1 Problema: Falta Script para Setup Inicial

**Severidad:** 🟡 MAYOR

**Descripción:**
No hay script que automatice el setup inicial del proyecto.

**Scripts Faltantes:**
- `pnpm install` en raíz y apps
- `prisma generate` en backend
- `prisma migrate deploy` o `prisma migrate dev`
- Verificación de variables de entorno
- Build de Prisma Client

**Impacto:**
- Setup manual propenso a errores
- Desarrolladores pueden olvidar pasos
- Inconsistencias entre entornos

---

## Resumen de Problemas por Severidad

### 🔴 Críticos (12)
1. Configuración incorrecta del monorepo
2. Scripts de inicio usan npm
3. next.config.ts incompleto
4. i18n con imports dinámicos problemáticos
5. Variables de entorno no documentadas
6. Guard global puede bloquear rutas públicas
7. Prisma Client no generado
8. DATABASE_URL no documentada
9. Falta .env.example
10. Valores por defecto inseguros
11. i18n imports dinámicos
12. Falta validación de migraciones

### 🟡 Mayores (8)
1. CORS configuración estricta
2. Cliente API usa sessionStorage en SSR
3. Cookies HttpOnly - verificación
4. TenantContextGuard requiere auth
5. Manejo de errores incompleto
6. Configuración de paths TypeScript
7. Falta next-i18next
8. Falta script de setup

### 🟢 Menores (5)
1. Namespace 'common' inconsistente
2. Falta logging estructurado
3. No hay tests
4. Documentación incompleta
5. Falta CI/CD

---

## Próximos Pasos

1. **Revisar PRDs generados** para cada problema crítico
2. **Revisar AI-Specs** para implementación de fixes
3. **Seguir Master Fix Plan** para orden de ejecución
4. **Validar cada fix** antes de continuar

---

## Referencias

- IA-Specs/01-saas-architecture-and-stack.mdc
- IA-Specs/02-internacionalizacion-y-ux.mdc
- IA-Specs/04-seguridad-y-compliance.mdc
- IA-Specs/05-frontend-standards.mdc
- IA-Specs/06-backend-standards.mdc

