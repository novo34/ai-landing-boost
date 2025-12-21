# PRD-04: Configuración Completa de Next.js

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente

---

## Problema Detectado

El archivo `next.config.ts` está prácticamente vacío, faltan configuraciones críticas para variables de entorno, imágenes, seguridad, i18n y optimizaciones.

## Impacto en el SaaS

- **Crítico:** Variables de entorno no disponibles en el cliente
- Problemas con imágenes y assets
- Falta de headers de seguridad
- i18n puede no funcionar correctamente
- Build puede fallar o ser subóptimo
- Problemas de rendimiento

## Causa Raíz

Configuración incompleta de Next.js. El proyecto fue creado con configuración mínima y no se completaron las configuraciones necesarias.

## Requisitos Funcionales

### RF-01: Variables de Entorno Públicas
- Exponer `NEXT_PUBLIC_API_URL` correctamente
- Validar que las variables están definidas

### RF-02: Configuración de Imágenes
- Configurar dominios permitidos para imágenes
- Optimización de imágenes habilitada

### RF-03: Headers de Seguridad
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

### RF-04: Configuración de i18n
- Soporte para detección de idioma
- Configuración de locales soportados
- Routing de idiomas si es necesario

### RF-05: Optimizaciones
- Compresión
- Bundle analysis
- Source maps en desarrollo

## Requisitos Técnicos

### RT-01: next.config.ts Completo
```typescript
// apps/web/next.config.ts
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

  // Configuración experimental (si es necesario)
  experimental: {
    // Optimizaciones futuras
  },
};

export default nextConfig;
```

### RT-02: Validación de Variables
```typescript
// apps/web/lib/config/env.ts
export function validateEnv() {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn(
      '⚠️ NEXT_PUBLIC_API_URL is not set. Using default: http://localhost:3001'
    );
  }
}

// Llamar en app/layout.tsx o _app.tsx
if (typeof window === 'undefined') {
  validateEnv();
}
```

## Criterios de Aceptación QA

- [ ] `next.config.ts` incluye todas las configuraciones necesarias
- [ ] Variables de entorno públicas están disponibles en el cliente
- [ ] Imágenes se cargan y optimizan correctamente
- [ ] Headers de seguridad están presentes
- [ ] Build de producción funciona correctamente
- [ ] No hay warnings en el build
- [ ] Rendimiento es óptimo

## Consideraciones de Seguridad

- Headers de seguridad configurados correctamente
- CSP no bloquea recursos necesarios
- Variables de entorno públicas no exponen secretos

## Dependencias

- PRD-02 (variables de entorno) - NEXT_PUBLIC_API_URL debe estar configurada

## Referencias

- IA-Specs/05-frontend-standards.mdc
- Next.js documentation
- OWASP security headers

