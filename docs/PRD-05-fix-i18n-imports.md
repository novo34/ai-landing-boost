# PRD-05: Corrección de Sistema i18n con Imports Dinámicos

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente

---

## Problema Detectado

El sistema de i18n usa imports dinámicos que pueden fallar en el build de Next.js App Router. Los imports dinámicos con paths variables no son estáticos y pueden causar errores en tiempo de compilación.

## Impacto en el SaaS

- **Crítico:** Build de Next.js puede fallar
- Traducciones no se cargan correctamente
- Errores en runtime
- Sistema completamente inoperativo
- UX pobre con textos sin traducir

## Causa Raíz

Next.js App Router requiere que los imports dinámicos sean estáticos en tiempo de build. Los imports con paths variables como `./locales/${locale}/${namespace}.json` no pueden ser resueltos estáticamente.

## Requisitos Funcionales

### RF-01: Imports Estáticos
- Reemplazar imports dinámicos con imports estáticos
- O usar un sistema de i18n compatible con App Router

### RF-02: Compatibilidad con App Router
- Sistema debe funcionar en Server Components
- Sistema debe funcionar en Client Components
- No debe romper el build

### RF-03: Performance
- Carga lazy de traducciones cuando sea posible
- Cache de traducciones
- No bloquear el render inicial

## Requisitos Técnicos

### RT-01: Solución con Imports Estáticos
```typescript
// apps/web/lib/i18n/translations.ts
// Imports estáticos de todas las traducciones
import esCommon from './locales/es/common.json';
import esLanding from './locales/es/landing.json';
import enCommon from './locales/en/common.json';
import enLanding from './locales/en/landing.json';

const translations = {
  es: {
    common: esCommon,
    landing: esLanding,
  },
  en: {
    common: enCommon,
    landing: enLanding,
  },
} as const;

export function getTranslations(
  namespace: TranslationNamespace,
  locale: Locale
): Record<string, any> {
  return translations[locale]?.[namespace] || {};
}
```

### RT-02: Alternativa con next-intl (Recomendada)
```typescript
// apps/web/lib/i18n/config.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  // Validate locale
  if (!locale || !['es', 'en'].includes(locale)) {
    locale = 'es';
  }

  return {
    locale,
    messages: (await import(`./locales/${locale}/common.json`)).default,
  };
});
```

### RT-03: Actualización de useTranslation
```typescript
// apps/web/lib/i18n/client.ts
'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';

export function useTranslation(namespace: TranslationNamespace = 'common') {
  const t = useNextIntlTranslations(namespace);
  return { t, locale: 'es' }; // O detectar dinámicamente
}
```

## Criterios de Aceptación QA

- [ ] Build de Next.js funciona sin errores
- [ ] Traducciones se cargan correctamente
- [ ] Funciona en Server Components
- [ ] Funciona en Client Components
- [ ] No hay errores en runtime
- [ ] Performance es aceptable
- [ ] Todos los textos están traducidos

## Consideraciones de Seguridad

- No hay implicaciones de seguridad directas
- Validar que los locales son seguros (no path traversal)

## Dependencias

- PRD-04 (next.config) debe estar completado
- Decidir si usar next-intl o solución custom

## Referencias

- IA-Specs/02-internacionalizacion-y-ux.mdc
- Next.js App Router documentation
- next-intl documentation

