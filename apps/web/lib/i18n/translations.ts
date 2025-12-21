// Imports estáticos de todas las traducciones
import esCommon from './locales/es/common.json';
import esLanding from './locales/es/landing.json';
import esPlatform from './locales/es/platform.json';
import enCommon from './locales/en/common.json';
import enLanding from './locales/en/landing.json';
import enPlatform from './locales/en/platform.json';
import deCommon from './locales/de/common.json';
import deLanding from './locales/de/landing.json';
import dePlatform from './locales/de/platform.json';
import frCommon from './locales/fr/common.json';
import frLanding from './locales/fr/landing.json';
import frPlatform from './locales/fr/platform.json';
import itCommon from './locales/it/common.json';
import itLanding from './locales/it/landing.json';
import itPlatform from './locales/it/platform.json';
import ptCommon from './locales/pt/common.json';
import ptLanding from './locales/pt/landing.json';
import ptPlatform from './locales/pt/platform.json';
import nlCommon from './locales/nl/common.json';
import nlLanding from './locales/nl/landing.json';
import nlPlatform from './locales/nl/platform.json';
import plCommon from './locales/pl/common.json';
import plLanding from './locales/pl/landing.json';
import plPlatform from './locales/pl/platform.json';

export type Locale = 'es' | 'en' | 'de' | 'fr' | 'it' | 'pt' | 'nl' | 'pl';
export type TranslationNamespace = 'common' | 'landing' | 'platform';

const translations = {
  es: {
    common: esCommon,
    landing: esLanding,
    platform: esPlatform,
  },
  en: {
    common: enCommon,
    landing: enLanding,
    platform: enPlatform,
  },
  de: {
    common: deCommon,
    landing: deLanding,
    platform: dePlatform,
  },
  fr: {
    common: frCommon,
    landing: frLanding,
    platform: frPlatform,
  },
  it: {
    common: itCommon,
    landing: itLanding,
    platform: itPlatform,
  },
  pt: {
    common: ptCommon,
    landing: ptLanding,
    platform: ptPlatform,
  },
  nl: {
    common: nlCommon,
    landing: nlLanding,
    platform: nlPlatform,
  },
  pl: {
    common: plCommon,
    landing: plLanding,
    platform: plPlatform,
  },
} as const;

export function getTranslations(
  namespace: TranslationNamespace,
  locale: Locale
): Record<string, unknown> {
  return translations[locale]?.[namespace] || {};
}

export function getAllTranslations(locale: Locale) {
  return translations[locale] || translations.es;
}

