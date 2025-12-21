// Sistema de internacionalización completo para Next.js
// Alineado con IA-Specs/02-internacionalizacion-y-ux.mdc
// Usa imports estáticos para compatibilidad con Next.js App Router

import { getTranslations as getTranslationsStatic } from './translations';
import type { Locale, TranslationNamespace } from './translations';
import { measureServer } from '../perf/perfLogger';

export type { Locale, TranslationNamespace } from './translations';

export const defaultLocale: Locale = 'es';
// Idiomas soportados en la UI (frontend)
// Idiomas de la UE y Suiza: Español, Inglés, Alemán, Francés, Italiano, Portugués, Holandés, Polaco
export const supportedLocales: Locale[] = ['es', 'en', 'de', 'fr', 'it', 'pt', 'nl', 'pl'];

// Cache simple para detectLocale() - evita múltiples llamadas en el mismo request
// En Next.js, cada request tiene su propio contexto, así que esto es seguro
let cachedLocale: Locale | null = null;
let cacheInitialized = false;

/**
 * Detecta el idioma según prioridad (Server Components):
 * 1. Cookie lang
 * 2. Accept-Language header
 * 3. Fallback a defaultLocale
 * 
 * ⚡ OPTIMIZADO: Usa cache para evitar múltiples llamadas en el mismo request
 */
export async function detectLocale(): Promise<Locale> {
  const wasCached = cacheInitialized && !!cachedLocale;
  
  return await measureServer('detectLocale', async () => {
    // Si ya tenemos el locale cacheado en este request, retornarlo inmediatamente
    // Esto es seguro porque cada request tiene su propio contexto en Next.js
    if (cacheInitialized && cachedLocale) {
      return cachedLocale;
    }
    
    try {
      // OPTIMIZACIÓN: Importar ambos módulos en paralelo
      const [{ cookies }, { headers }] = await Promise.all([
        import('next/headers'),
        import('next/headers'),
      ]);
      
      const cookieStore = await cookies();
      const headersList = await headers();
      
      // 1. Cookie (más rápido, verificar primero)
      const langCookie = cookieStore.get('lang')?.value;
      if (langCookie && supportedLocales.includes(langCookie as Locale)) {
        cachedLocale = langCookie as Locale;
        cacheInitialized = true;
        return cachedLocale;
      }
      
      // 2. Accept-Language header
      const acceptLanguage = headersList.get('accept-language');
      if (acceptLanguage) {
        // Optimización: solo procesar los primeros idiomas (los más relevantes)
        const languages = acceptLanguage
          .split(',')
          .slice(0, 3) // Solo los primeros 3 idiomas
          .map(lang => lang.split(';')[0].trim().toLowerCase().substring(0, 2));
        
        for (const lang of languages) {
          if (supportedLocales.includes(lang as Locale)) {
            cachedLocale = lang as Locale;
            cacheInitialized = true;
            return cachedLocale;
          }
        }
      }
    } catch (error) {
      // En Client Components o si hay problemas con headers, usar fallback
      // No lanzar error para evitar 500 en páginas simples
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error detecting locale (usando fallback):', error);
      }
    }
    
    // 3. Fallback - siempre retornar algo válido
    cachedLocale = defaultLocale;
    cacheInitialized = true;
    return cachedLocale;
  }, { cacheHit: wasCached });
}

/**
 * Limpia el cache (útil para testing o cuando cambia el locale)
 */
export function clearLocaleCache() {
  cachedLocale = null;
  cacheInitialized = false;
}

/**
 * Obtiene una función de traducción para Server Components
 * @param namespace - Namespace de traducciones (ej: "landing", "common")
 * @param locale - Idioma (opcional, se detecta automáticamente si no se proporciona)
 */
export async function getTranslations(
  namespace: TranslationNamespace = 'common',
  locale?: Locale
): Promise<(key: string, params?: Record<string, string | number>) => string> {
  const detectedLocale = locale || await detectLocale();
  const translations = getTranslationsStatic(namespace, detectedLocale);
  
  return function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: Record<string, unknown> | string = translations as Record<string, unknown>;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k] as Record<string, unknown> | string;
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
