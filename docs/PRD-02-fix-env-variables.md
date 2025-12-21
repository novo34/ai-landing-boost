# PRD-02: Documentación y Configuración de Variables de Entorno

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente

---

## Problema Detectado

No existen archivos `.env.example` que documenten las variables de entorno requeridas. El backend y frontend requieren múltiples variables críticas que no están documentadas, causando que el sistema no pueda iniciarse.

## Impacto en el SaaS

- **Crítico:** El sistema no puede iniciarse sin las variables correctas
- Desarrolladores no saben qué configurar
- Valores por defecto inseguros (JWT_SECRET)
- Configuración inconsistente entre entornos
- Riesgo de seguridad en producción

## Causa Raíz

Falta de documentación y archivos de ejemplo para variables de entorno. El código tiene valores por defecto inseguros que se usan si las variables no están configuradas.

## Requisitos Funcionales

### RF-01: Archivos .env.example
- Crear `apps/api/.env.example` con todas las variables del backend
- Crear `apps/web/.env.example` con todas las variables del frontend
- Documentar cada variable con comentarios explicativos

### RF-02: Validación de Variables
- El backend debe validar variables críticas al iniciar
- Debe fallar con mensaje claro si faltan variables requeridas
- No debe usar valores por defecto inseguros en producción

### RF-03: Documentación
- README debe incluir instrucciones de setup
- Documentar formato esperado de cada variable
- Incluir ejemplos de valores válidos

## Requisitos Técnicos

### RT-01: apps/api/.env.example
```env
# ============================================
# Database Configuration
# ============================================
# MySQL connection string
# Format: mysql://user:password@host:port/database
DATABASE_URL=mysql://root:password@localhost:3306/automai

# ============================================
# JWT Configuration
# ============================================
# Secret key for signing JWT access tokens
# MUST be changed in production (min 32 characters, random)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

# Secret key for signing JWT refresh tokens
# Should be different from JWT_SECRET
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

### RT-02: apps/web/.env.example
```env
# ============================================
# API Configuration
# ============================================
# Backend API URL
# Must match the PORT and protocol of the backend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### RT-03: Validación en Backend
```typescript
// apps/api/src/config/env.validation.ts
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please copy .env.example to .env and configure the values.`
    );
  }

  // Validate JWT_SECRET is not default
  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production' && 
      process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be changed from default value in production!'
    );
  }
}
```

## Criterios de Aceptación QA

- [ ] `apps/api/.env.example` existe con todas las variables documentadas
- [ ] `apps/web/.env.example` existe con todas las variables documentadas
- [ ] Backend valida variables críticas al iniciar
- [ ] Backend falla con mensaje claro si faltan variables
- [ ] No se usan valores por defecto inseguros en producción
- [ ] README incluye instrucciones de setup
- [ ] Desarrollador nuevo puede configurar el proyecto siguiendo la documentación

## Consideraciones de Seguridad

- **Crítico:** JWT_SECRET y JWT_REFRESH_SECRET deben ser aleatorios y seguros
- **Crítico:** No commitear archivos `.env` al repositorio
- Validar que valores por defecto no se usen en producción
- Documentar requisitos de seguridad para cada variable

## Dependencias

- PRD-01 (fix monorepo) debe estar completado primero para poder probar

## Referencias

- IA-Specs/04-seguridad-y-compliance.mdc
- IA-Specs/06-backend-standards.mdc

