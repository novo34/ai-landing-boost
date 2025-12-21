import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

type Locale = 'es' | 'en';
type Translations = Record<string, any>;

@Injectable()
export class EmailI18nService {
  private readonly logger = new Logger(EmailI18nService.name);
  private translations: Record<Locale, Translations> = {
    es: {},
    en: {},
  };

  constructor() {
    this.loadTranslations();
  }

  /**
   * Carga las traducciones desde archivos JSON
   */
  private loadTranslations() {
    try {
      // Intentar múltiples rutas para compatibilidad con desarrollo y producción
      // __dirname en compilado: dist/src/modules/email/services
      // __dirname en desarrollo: src/modules/email/services (si se ejecuta con ts-node)
      const possiblePaths = [
        // Primero: desde el directorio del módulo email (relativo a services/)
        join(__dirname, '../i18n'),
        // Segundo: desde src (si estamos en desarrollo o si dist mantiene estructura)
        join(process.cwd(), 'apps/api/src/modules/email/i18n'),
        // Tercero: desde la raíz del proyecto (monorepo)
        join(process.cwd(), 'src/modules/email/i18n'),
        // Cuarto: desde dist (producción compilada)
        join(process.cwd(), 'apps/api/dist/src/modules/email/i18n'),
        join(process.cwd(), 'dist/src/modules/email/i18n'),
      ];

      let esPath: string | null = null;
      let enPath: string | null = null;

      for (const basePath of possiblePaths) {
        const testEsPath = join(basePath, 'es.json');
        const testEnPath = join(basePath, 'en.json');
        try {
          // Verificar si los archivos existen leyéndolos
          readFileSync(testEsPath, 'utf-8');
          readFileSync(testEnPath, 'utf-8');
          esPath = testEsPath;
          enPath = testEnPath;
          break;
        } catch {
          // Continuar con la siguiente ruta
          continue;
        }
      }

      if (!esPath || !enPath) {
        throw new Error(
          `Translation files not found. Searched in: ${possiblePaths.map(p => join(p, 'es.json')).join(', ')}`
        );
      }

      this.translations.es = JSON.parse(readFileSync(esPath, 'utf-8'));
      this.translations.en = JSON.parse(readFileSync(enPath, 'utf-8'));

      this.logger.log(`✅ Email translations loaded from: ${esPath}`);
    } catch (error) {
      this.logger.error(`❌ Failed to load email translations: ${error}`);
      // Fallback a traducciones vacías (la aplicación puede funcionar sin traducciones)
      this.translations = { es: {}, en: {} };
      this.logger.warn('⚠️ Email service will continue with empty translations');
    }
  }

  /**
   * Obtiene una traducción por clave
   * @param locale - Idioma ('es' | 'en')
   * @param key - Clave de traducción (ej: 'emails.verification.subject')
   * @param fallback - Fallback si no se encuentra (default: 'es')
   */
  t(locale: Locale | string | null | undefined, key: string, fallback: Locale = 'es'): string {
    const normalizedLocale = this.normalizeLocale(locale) || fallback;
    const translations = this.translations[normalizedLocale] || this.translations[fallback];

    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback a español si no se encuentra
        if (normalizedLocale !== 'es') {
          return this.t('es', key, 'es');
        }
        this.logger.warn(`Translation key not found: ${key} (locale: ${normalizedLocale})`);
        return key; // Devolver la clave si no se encuentra
      }
    }

    return typeof value === 'string' ? value : key;
  }

  /**
   * Normaliza el locale a 'es' o 'en'
   */
  private normalizeLocale(locale: string | null | undefined): Locale | null {
    if (!locale) return null;
    const normalized = locale.toLowerCase().split('-')[0];
    if (normalized === 'es' || normalized === 'en') {
      return normalized as Locale;
    }
    return null; // Si no es es/en, retornar null para usar fallback
  }

  /**
   * Crea un helper de Handlebars para usar en templates
   */
  createHandlebarsHelper(): (key: string, options?: any) => string {
    return (key: string, options?: any) => {
      const locale = options?.data?.root?.locale || 'es';
      return this.t(locale, key);
    };
  }
}


