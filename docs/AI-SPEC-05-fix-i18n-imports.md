# AI-SPEC-05: Corrección de Sistema i18n con Imports Dinámicos

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-05  
> **Prioridad:** 🔴 CRÍTICA

---

## Árbol de Archivos a Modificar

```
ai-landing-boost/
└── apps/
    └── web/
        └── lib/
            └── i18n/
                ├── index.ts         [MODIFICAR]
                ├── client.ts        [MODIFICAR]
                └── translations.ts  [CREAR - si Opción A]
```

**NOTA:** Este SPEC tiene dos opciones. Se recomienda la Opción B (next-intl).

---

## Decisión: Opción A o B

### Opción A: Imports Estáticos (Rápido)
- ✅ Más rápido de implementar
- ❌ Menos mantenible
- ❌ No aprovecha librerías especializadas

### Opción B: next-intl (Recomendado)
- ✅ Solución profesional
- ✅ Compatible con App Router
- ✅ Mejor mantenibilidad
- ❌ Requiere instalar dependencia

**Recomendación:** Opción B (next-intl)

---

## Opción A: Imports Estáticos

### Paso 1: Crear translations.ts

**Archivo:** `apps/web/lib/i18n/translations.ts`

**Acción:** Crear archivo nuevo

**Código:**
```typescript
// Imports estáticos de todas las traducciones
import esCommon from './locales/es/common.json';
import esLanding from './locales/es/landing.json';
import enCommon from './locales/en/common.json';
import enLanding from './locales/en/landing.json';

export type Locale = 'es' | 'en';
export type TranslationNamespace = 'common' | 'landing';

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

export function getAllTranslations(locale: Locale) {
  return translations[locale] || translations.es;
}
```

### Paso 2: Actualizar index.ts

**Archivo:** `apps/web/lib/i18n/index.ts`

**Acción:** Reemplazar función `loadTranslations` y `getTranslations`

**Código:**
```typescript
import { getTranslations as getTranslationsStatic } from './translations';
import type { Locale, TranslationNamespace } from './translations';

export type { Locale, TranslationNamespace } from './translations';

export const defaultLocale: Locale = 'es';
export const supportedLocales: Locale[] = ['es', 'en'];

// Detección de locale (sin cambios)
export async function detectLocale(): Promise<Locale> {
  // ... código existente sin cambios
}

// Función de traducción actualizada
export async function getTranslations(
  namespace: TranslationNamespace = 'common',
  locale?: Locale
): Promise<(key: string, params?: Record<string, string | number>) => string> {
  const detectedLocale = locale || await detectLocale();
  const translations = getTranslationsStatic(namespace, detectedLocale);
  
  return function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${namespace}.${key}`);
        return key;
      }
    }
    
    if (typeof value === 'string') {
      if (params) {
        let result = value;
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
        return result;
      }
      return value;
    }
    
    return key;
  };
}
```

---

## Opción B: next-intl (Recomendado)

### Paso 1: Instalar next-intl

**Comando:**
```powershell
Set-Location apps/web
pnpm add next-intl
```

### Paso 2: Crear Configuración de next-intl

**Archivo:** `apps/web/i18n.ts` (nuevo)

**Código:**
```typescript
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale: locale as Locale,
    messages: (await import(`./lib/i18n/locales/${locale}/common.json`)).default,
  };
});
```

### Paso 3: Actualizar next.config.ts

**Archivo:** `apps/web/next.config.ts`

**Acción:** Agregar plugin de next-intl

**Código a Agregar:**
```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // ... configuración existente
};

export default withNextIntl(nextConfig);
```

### Paso 4: Actualizar layout.tsx

**Archivo:** `apps/web/app/layout.tsx`

**Acción:** Simplificar usando next-intl

**Código:**
```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Paso 5: Actualizar client.ts

**Archivo:** `apps/web/lib/i18n/client.ts`

**Acción:** Usar next-intl en lugar de implementación custom

**Código:**
```typescript
'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';

export type TranslationNamespace = 'common' | 'landing';

export function useTranslation(namespace: TranslationNamespace = 'common') {
  const t = useNextIntlTranslations(namespace);
  const locale = 'es'; // O detectar dinámicamente desde next-intl
  
  return { t, locale, setLocale: () => {} }; // setLocale puede implementarse después
}
```

---

## Condiciones Previas

1. ✅ SPEC-04 completado (next.config configurado)
2. ✅ Archivos de traducción existen en `lib/i18n/locales/`

---

## Tests Automatizables

### Test 1: Verificar Build

```bash
# Build debe funcionar sin errores
cd apps/web
pnpm run build
```

### Test 2: Verificar Traducciones

```typescript
// tests/i18n/translations.test.ts
import { getTranslations } from '../../lib/i18n';

describe('i18n', () => {
  it('should load translations', async () => {
    const t = await getTranslations('common', 'es');
    expect(typeof t).toBe('function');
    expect(t('common.save')).toBeDefined();
  });
});
```

---

## Notas para Compliance

- ✅ **GDPR:** No afecta directamente
- ✅ **Cookies:** No afecta directamente
- ✅ **CORS:** No afecta directamente
- ✅ **Tenants:** i18n puede usar locale del tenant

---

## Validación Post-Implementación

1. Build funciona sin errores
2. Traducciones se cargan correctamente
3. Funciona en Server Components
4. Funciona en Client Components
5. No hay errores en runtime
6. Textos se muestran traducidos

---

## Orden de Ejecución

Este SPEC debe ejecutarse **QUINTO**, después de SPEC-04.

