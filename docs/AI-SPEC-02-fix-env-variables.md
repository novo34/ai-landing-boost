# AI-SPEC-02: Documentación y Configuración de Variables de Entorno

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-02  
> **Prioridad:** 🔴 CRÍTICA

---

## Árbol de Archivos a Modificar/Crear

```
ai-landing-boost/
├── apps/
│   ├── api/
│   │   ├── .env.example              [CREAR]
│   │   └── src/
│   │       └── config/
│   │           └── env.validation.ts  [CREAR]
│   └── web/
│       └── .env.example              [CREAR]
└── README.md                          [MODIFICAR]
```

---

## Pasos Exactos de Ejecución

### Paso 1: Crear apps/api/.env.example

**Archivo:** `apps/api/.env.example`

**Acción:** Crear archivo nuevo

**Código:**
```env
# ============================================
# Database Configuration
# ============================================
# MySQL connection string
# Format: mysql://user:password@host:port/database
# Example: mysql://root:password@localhost:3306/automai
DATABASE_URL=mysql://root:password@localhost:3306/automai

# ============================================
# JWT Configuration
# ============================================
# Secret key for signing JWT access tokens
# MUST be changed in production (min 32 characters, random)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

# Secret key for signing JWT refresh tokens
# Should be different from JWT_SECRET
# Generate with: openssl rand -base64 32
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars

# Access token expiration time
# Format: number + unit (s=seconds, m=minutes, h=hours, d=days)
# Examples: 15m, 1h, 30m
JWT_EXPIRES_IN=15m

# Refresh token expiration time
# Format: number + unit
# Examples: 7d, 30d, 14d
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# Server Configuration
# ============================================
# Port where the API server will listen
PORT=3001

# Node environment: development | production | test
NODE_ENV=development

# Frontend URL(s) for CORS
# Can be comma-separated for multiple origins
# Examples: http://localhost:3000, https://app.example.com
FRONTEND_URL=http://localhost:3000

# ============================================
# Security Configuration
# ============================================
# Bcrypt rounds for password hashing
# Recommended: 10-12 for development, 12+ for production
BCRYPT_ROUNDS=12
```

---

### Paso 2: Crear apps/web/.env.example

**Archivo:** `apps/web/.env.example`

**Acción:** Crear archivo nuevo

**Código:**
```env
# ============================================
# API Configuration
# ============================================
# Backend API URL
# Must match the PORT and protocol of the backend
# In production, use your production API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

### Paso 3: Crear Validación de Variables de Entorno

**Archivo:** `apps/api/src/config/env.validation.ts`

**Acción:** Crear archivo nuevo

**Código:**
```typescript
/**
 * Validación de variables de entorno
 * Se ejecuta al iniciar la aplicación
 */

export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\n💡 Please copy .env.example to .env and configure the values.');
    console.error('   Example: cp apps/api/.env.example apps/api/.env\n');
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validar que JWT_SECRET no sea el valor por defecto en producción
  const defaultJwtSecret = 'your-secret-key-change-in-production';
  const defaultJwtSecretLong = 'your-super-secret-jwt-key-change-in-production-min-32-chars';
  
  if (
    (process.env.JWT_SECRET === defaultJwtSecret || 
     process.env.JWT_SECRET === defaultJwtSecretLong) && 
    process.env.NODE_ENV === 'production'
  ) {
    console.error('❌ JWT_SECRET must be changed from default value in production!');
    console.error('   Generate a secure secret with: openssl rand -base64 32\n');
    throw new Error('JWT_SECRET must be changed from default value in production');
  }

  // Validar formato de DATABASE_URL
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('mysql://')) {
    console.warn('⚠️ DATABASE_URL should start with mysql://');
  }

  // Validar que JWT_SECRET tiene longitud mínima
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️ JWT_SECRET should be at least 32 characters long');
  }

  console.log('✅ Environment variables validated');
}

// Validar al importar el módulo
if (require.main === module) {
  validateEnv();
}
```

---

### Paso 4: Integrar Validación en main.ts

**Archivo:** `apps/api/src/main.ts`

**Acción:** Agregar import y llamada al inicio de bootstrap()

**Código a Agregar:**
```typescript
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  // Validar variables de entorno antes de iniciar
  validateEnv();
  
  const app = await NestFactory.create(AppModule);
  // ... resto del código
}
```

**Ubicación:** Al inicio de la función `bootstrap()`, antes de `NestFactory.create()`

---

### Paso 5: Actualizar README.md

**Archivo:** `README.md`

**Acción:** Agregar sección de configuración de variables de entorno

**Código a Agregar:**
```markdown
## Configuración de Variables de Entorno

### Backend (apps/api)

1. Copiar el archivo de ejemplo:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

2. Editar `apps/api/.env` y configurar las variables:
   - `DATABASE_URL`: URL de conexión a MySQL
   - `JWT_SECRET`: Secreto para JWT (generar con `openssl rand -base64 32`)
   - `JWT_REFRESH_SECRET`: Secreto para refresh tokens
   - `FRONTEND_URL`: URL del frontend para CORS

### Frontend (apps/web)

1. Copiar el archivo de ejemplo:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

2. Editar `apps/web/.env` y configurar:
   - `NEXT_PUBLIC_API_URL`: URL del backend API

### Generar Secretos Seguros

Para generar secretos seguros para JWT:

```bash
# JWT_SECRET
openssl rand -base64 32

# JWT_REFRESH_SECRET
openssl rand -base64 32
```
```

---

## Código Sugerido/Reemplazos

### Actualizar .gitignore

**Archivo:** `.gitignore`

**Acción:** Verificar que incluye:

```
# Environment variables
.env
.env.local
.env.*.local
apps/api/.env
apps/web/.env
```

---

## Condiciones Previas

1. ✅ SPEC-01 completado (monorepo configurado)
2. ✅ Estructura de carpetas `apps/api/src/config` existe

---

## Tests Automatizables

### Test 1: Verificar .env.example Existe

```bash
test -f apps/api/.env.example && echo "✅ Backend .env.example existe" || echo "❌ Backend .env.example no existe"
test -f apps/web/.env.example && echo "✅ Frontend .env.example existe" || echo "❌ Frontend .env.example no existe"
```

### Test 2: Verificar Validación

```typescript
// tests/config/env.validation.spec.ts
import { validateEnv } from '../../src/config/env.validation';

describe('Env Validation', () => {
  it('should throw if DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => validateEnv()).toThrow();
  });

  it('should throw if JWT_SECRET is missing', () => {
    process.env.DATABASE_URL = 'mysql://test';
    delete process.env.JWT_SECRET;
    expect(() => validateEnv()).toThrow();
  });
});
```

---

## Notas para Compliance

- ✅ **Seguridad:** Valida que JWT_SECRET no sea el valor por defecto en producción
- ✅ **GDPR:** No afecta directamente, pero asegura configuración segura
- ✅ **Cookies:** No afecta, pero JWT_SECRET es crítico para seguridad de cookies
- ✅ **CORS:** FRONTEND_URL es necesario para CORS correcto

---

## Validación Post-Implementación

1. Copiar `.env.example` a `.env` en ambas apps
2. Configurar variables mínimas requeridas
3. Intentar iniciar el backend - debe validar y fallar si faltan variables
4. Configurar todas las variables
5. Backend debe iniciar correctamente
6. Verificar que no se usan valores por defecto inseguros

---

## Orden de Ejecución

Este SPEC debe ejecutarse **SEGUNDO**, después de SPEC-01, ya que las variables son necesarias para que el sistema funcione.

