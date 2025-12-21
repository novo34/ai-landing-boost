'use client';

// Sistema de i18n para Client Components
// Alineado con IA-Specs/02-internacionalizacion-y-ux.mdc

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Locale, TranslationNamespace } from './translations';
import { getTranslations } from './translations';

type Translations = Record<string, string | Record<string, string | Record<string, string>>>;

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (namespace: TranslationNamespace) => (key: string, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

/**
 * Provider de contexto para i18n en Client Components
 */
export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || 'es');
  
  // Inicializar cache con traducciones comunes de forma síncrona
  // OPTIMIZACIÓN: Solo cargar 'common' inicialmente (más usado)
  // 'landing' y 'platform' se cargan bajo demanda
  const getInitialCache = () => {
    const cache = new Map<string, Translations>();
    const loc = initialLocale || 'es';
    try {
      // Cargar 'common' inicialmente (más crítico y usado en toda la app)
      const common = getTranslations('common', loc) as Translations;
      if (common && Object.keys(common).length > 0) {
        cache.set(`common:${loc}`, common);
      }
      // También pre-cargar 'landing' y 'platform' para evitar problemas de hidratación
      try {
        const landing = getTranslations('landing', loc) as Translations;
        if (landing && Object.keys(landing).length > 0) {
          cache.set(`landing:${loc}`, landing);
        }
      } catch {
        // Ignorar si landing no existe
      }
      try {
        const platform = getTranslations('platform', loc) as Translations;
        if (platform && Object.keys(platform).length > 0) {
          cache.set(`platform:${loc}`, platform);
        }
      } catch {
        // Ignorar si platform no existe
      }
    } catch (error) {
      console.warn('Error loading initial translations:', error);
    }
    return cache;
  };
  
  const [translationsCache, setTranslationsCache] = useState<Map<string, Translations>>(getInitialCache);
  const pendingLoadsRef = useRef<Set<string>>(new Set());
  const requestedNamespacesRef = useRef<Set<string>>(new Set());

  // Cargar traducciones para un namespace (usando imports estáticos)
  const loadTranslationsClient = useCallback(async (namespace: string, loc: Locale): Promise<Translations> => {
    const cacheKey = `${namespace}:${loc}`;
    
    if (translationsCache.has(cacheKey)) {
      return translationsCache.get(cacheKey)!;
    }

    // Evitar cargas duplicadas
    if (pendingLoadsRef.current.has(cacheKey)) {
      return {};
    }

    pendingLoadsRef.current.add(cacheKey);

    try {
      // Usar imports estáticos desde translations.ts
      const { getTranslations } = await import('./translations');
      const data = getTranslations(namespace as TranslationNamespace, loc) as Translations;
      // Actualizar el cache usando useEffect para evitar actualizaciones durante el render
      setTranslationsCache(prev => {
        if (prev.has(cacheKey)) {
          return prev;
        }
        const newCache = new Map(prev);
        newCache.set(cacheKey, data);
        return newCache;
      });
      return data;
    } catch (error) {
      console.warn(`Translation file not found: ${namespace}.json for locale ${loc}`);
      return {};
    } finally {
      pendingLoadsRef.current.delete(cacheKey);
    }
  }, [translationsCache]);

  // Detectar idioma inicial desde cookie o query param
  useEffect(() => {
    // Solo ejecutar en el cliente después del montaje
    if (typeof window === 'undefined') return;

    // Leer de cookie
    const cookieLang = document.cookie
      .split('; ')
      .find(row => row.startsWith('lang='))
      ?.split('=')[1] as Locale | undefined;
    
    const supportedLangs = ['es', 'en', 'de', 'fr', 'it', 'pt', 'nl', 'pl'];
    if (cookieLang && supportedLangs.includes(cookieLang)) {
      setLocaleState(cookieLang as Locale);
      return;
    }

    // Leer de query param
    const urlParams = new URLSearchParams(window.location.search);
    const queryLang = urlParams.get('lang') as Locale | null;
    
    if (queryLang && supportedLangs.includes(queryLang)) {
      setLocaleState(queryLang);
      document.cookie = `lang=${queryLang}; path=/; max-age=31536000`;
      return;
    }

    // Leer de Accept-Language
    const acceptLanguage = navigator.language || navigator.languages?.[0];
    if (acceptLanguage) {
      const lang = acceptLanguage.substring(0, 2).toLowerCase();
      if (supportedLangs.includes(lang)) {
        setLocaleState(lang as Locale);
        return;
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.cookie = `lang=${newLocale}; path=/; max-age=31536000`;
    
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLocale);
    window.history.replaceState({}, '', url.toString());
    
    // Recargar traducciones si es necesario
    setTranslationsCache(new Map());
  }, []);

  const t = useCallback((namespace: TranslationNamespace) => {
    return (key: string, params?: Record<string, string | number>): string => {
      // Cargar traducciones de forma síncrona desde el cache
      const cacheKey = `${namespace}:${locale}`;
      let cached = translationsCache.get(cacheKey);
      
      // Si no está en cache, intentar cargar síncronamente desde getTranslations (fallback)
      // Esto es necesario porque el cache puede no estar inicializado en el primer render
      if (!cached) {
        try {
          const translations = getTranslations(namespace, locale) as Translations;
          if (translations && Object.keys(translations).length > 0) {
            cached = translations;
            // Actualizar cache inmediatamente si es posible (solo en cliente)
            if (typeof window !== 'undefined') {
              // Usar un setTimeout para actualizar el cache sin causar problemas de render
              setTimeout(() => {
                setTranslationsCache(prev => {
                  if (prev.has(cacheKey)) {
                    return prev;
                  }
                  const newCache = new Map(prev);
                  newCache.set(cacheKey, translations);
                  return newCache;
                });
              }, 0);
            }
          }
        } catch (error) {
          // Silenciar errores en producción
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Error loading translations for ${cacheKey}:`, error);
          }
        }
      }
      
      if (!cached) {
        // Si aún no está en cache, marcar como solicitado para cargar en useEffect
        if (typeof window !== 'undefined') {
          requestedNamespacesRef.current.add(cacheKey);
        }
        return key;
      }
      
      const keys = key.split('.');
      let value: string | Translations = cached;
      
      // Recorrer las claves anidadas
      for (const k of keys) {
        if (value && typeof value === 'object' && !Array.isArray(value) && k in value) {
          value = value[k] as string | Translations;
        } else {
          // Si no encuentra la clave, devolver la clave original
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Translation key not found: ${key} in namespace ${namespace}:${locale}`, {
              currentKey: k,
              availableKeys: value && typeof value === 'object' ? Object.keys(value) : [],
              valueType: typeof value
            });
          }
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
      
      // Si el valor final no es un string, devolver la clave original
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Translation value is not a string for key: ${key}`, {
          value,
          valueType: typeof value
        });
      }
      return key;
    };
  }, [locale, translationsCache, loadTranslationsClient]);

  // Pre-cargar traducciones comunes al cambiar de idioma
  useEffect(() => {
    // Solo ejecutar en el cliente después del montaje
    if (typeof window === 'undefined') return;
    
    // Asegurar que las traducciones comunes estén cargadas
    const cacheKey = `common:${locale}`;
    if (!translationsCache.has(cacheKey)) {
      try {
        const common = getTranslations('common', locale) as Translations;
        if (common) {
          setTranslationsCache(prev => {
            const newCache = new Map(prev);
            newCache.set(cacheKey, common);
            return newCache;
          });
        }
      } catch (error) {
        console.warn('Error loading common translations:', error);
      }
    }
    
    const landingKey = `landing:${locale}`;
    if (!translationsCache.has(landingKey)) {
      try {
        const landing = getTranslations('landing', locale) as Translations;
        if (landing) {
          setTranslationsCache(prev => {
            const newCache = new Map(prev);
            newCache.set(landingKey, landing);
            return newCache;
          });
        }
      } catch (error) {
        console.warn('Error loading landing translations:', error);
      }
    }
    
    const platformKey = `platform:${locale}`;
    if (!translationsCache.has(platformKey)) {
      try {
        const platform = getTranslations('platform', locale) as Translations;
        if (platform) {
          setTranslationsCache(prev => {
            const newCache = new Map(prev);
            newCache.set(platformKey, platform);
            return newCache;
          });
        }
      } catch (error) {
        console.warn('Error loading platform translations:', error);
      }
    }
  }, [locale]);

  // Cargar traducciones solicitadas durante el render
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const requested = Array.from(requestedNamespacesRef.current);
    if (requested.length === 0) return;
    
    requestedNamespacesRef.current.clear();
    
    requested.forEach(cacheKey => {
      const [namespace, loc] = cacheKey.split(':');
      if (namespace && loc) {
        // Intentar cargar síncronamente primero
        try {
          const translations = getTranslations(namespace as TranslationNamespace, loc as Locale) as Translations;
          if (translations && Object.keys(translations).length > 0) {
            setTranslationsCache(prev => {
              if (prev.has(cacheKey)) {
                return prev;
              }
              const newCache = new Map(prev);
              newCache.set(cacheKey, translations);
              return newCache;
            });
          } else {
            // Si falla, usar carga asíncrona
            loadTranslationsClient(namespace, loc as Locale).catch(() => {
              // Ignorar errores silenciosamente
            });
          }
        } catch (error) {
          // Si falla, usar carga asíncrona
          loadTranslationsClient(namespace, loc as Locale).catch(() => {
            // Ignorar errores silenciosamente
          });
        }
      }
    });
  });

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook useTranslation para Client Components
 */
export function useTranslation(namespace: TranslationNamespace = "common") {
  const context = useContext(LocaleContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within LocaleProvider');
  }

  const { locale, setLocale, t } = context;
  const translateFn = t(namespace);

  return { t: translateFn, locale, setLocale };
}

