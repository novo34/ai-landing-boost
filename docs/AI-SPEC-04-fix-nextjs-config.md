# AI-SPEC-04: Configuración Completa de Next.js

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-04  
> **Prioridad:** 🔴 CRÍTICA

---

## Árbol de Archivos a Modificar

```
ai-landing-boost/
└── apps/
    └── web/
        ├── next.config.ts           [MODIFICAR]
        └── lib/
            └── config/
                └── env.ts           [CREAR - opcional]
```

---

## Pasos Exactos de Ejecución

### Paso 1: Actualizar next.config.ts

**Archivo:** `apps/web/next.config.ts`

**Acción:** Reemplazar contenido completo

**Código:**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.automai.es',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Configuración de compilación
  reactStrictMode: true,
  swcMinify: true,

  // Source maps solo en desarrollo
  productionBrowserSourceMaps: false,

  // Optimizaciones
  compress: true,
  poweredByHeader: false,

  // Configuración experimental
  experimental: {
    // Optimizaciones futuras si es necesario
  },
};

export default nextConfig;
```

---

### Paso 2: Crear Validación de Variables (Opcional)

**Archivo:** `apps/web/lib/config/env.ts`

**Acción:** Crear archivo nuevo (opcional pero recomendado)

**Código:**
```typescript
/**
 * Validación de variables de entorno del frontend
 */

export function validateEnv() {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn(
      '⚠️ NEXT_PUBLIC_API_URL is not set. Using default: http://localhost:3001'
    );
  }

  // Validar formato de URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    new URL(apiUrl);
  } catch {
    console.error('❌ NEXT_PUBLIC_API_URL is not a valid URL:', apiUrl);
  }
}

// Llamar en desarrollo
if (process.env.NODE_ENV === 'development') {
  validateEnv();
}
```

---

## Código Sugerido/Reemplazos

Ninguno adicional.

---

## Condiciones Previas

1. ✅ SPEC-02 completado (variables de entorno configuradas)
2. ✅ `NEXT_PUBLIC_API_URL` configurada en `.env`

---

## Tests Automatizables

### Test 1: Verificar Build

```bash
# Build debe funcionar sin errores
cd apps/web
pnpm run build
```

### Test 2: Verificar Headers

```typescript
// tests/next.config.test.ts
import nextConfig from '../next.config';

describe('Next.js Config', () => {
  it('should have security headers', async () => {
    const headers = await nextConfig.headers?.();
    expect(headers).toBeDefined();
    expect(headers?.[0]?.headers).toContainEqual(
      expect.objectContaining({ key: 'X-Frame-Options' })
    );
  });

  it('should have image configuration', () => {
    expect(nextConfig.images).toBeDefined();
    expect(nextConfig.images?.remotePatterns).toBeDefined();
  });
});
```

---

## Notas para Compliance

- ✅ **Seguridad:** Headers de seguridad configurados
- ✅ **GDPR:** No afecta directamente
- ✅ **Cookies:** No afecta directamente
- ✅ **CORS:** No afecta directamente (es configuración del backend)

---

## Validación Post-Implementación

1. Ejecutar `pnpm run build` - debe funcionar sin errores
2. Verificar que las variables de entorno están disponibles en el cliente
3. Verificar headers de seguridad en las respuestas HTTP
4. Probar carga de imágenes
5. Iniciar en desarrollo y verificar que no hay warnings

---

## Orden de Ejecución

Este SPEC debe ejecutarse **CUARTO**, después de SPEC-02 y antes de SPEC-05.

