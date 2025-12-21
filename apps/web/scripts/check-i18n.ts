#!/usr/bin/env tsx
/**
 * Script de validación de i18n
 * Verifica que todas las claves existan en todos los locales (es/en mínimo)
 * Detecta claves faltantes, duplicados y estructura inconsistente
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCALES_DIR = path.join(__dirname, '../lib/i18n/locales');
const REQUIRED_LOCALES = ['es', 'en']; // Mínimo requerido
const ALL_LOCALES = ['es', 'en', 'de', 'fr', 'it', 'pt', 'nl', 'pl'];
const NAMESPACES = ['common', 'landing', 'platform'];

interface ValidationResult {
  missingKeys: Array<{ locale: string; namespace: string; key: string }>;
  extraKeys: Array<{ locale: string; namespace: string; key: string }>;
  structureMismatches: Array<{ namespace: string; key: string; locales: string[] }>;
}

function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getValueByKey(obj: any, keyPath: string): any {
  const keys = keyPath.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function loadTranslations(locale: string, namespace: string): any {
  const filePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

function validateI18n(): ValidationResult {
  const result: ValidationResult = {
    missingKeys: [],
    extraKeys: [],
    structureMismatches: [],
  };

  // Para cada namespace, usar 'es' como referencia
  for (const namespace of NAMESPACES) {
    const esTranslations = loadTranslations('es', namespace);
    if (!esTranslations) {
      console.warn(`⚠️  No se encontró ${namespace}.json en es`);
      continue;
    }

    const esKeys = getAllKeys(esTranslations);
    const allKeys = new Set(esKeys);

    // Verificar todos los locales
    for (const locale of ALL_LOCALES) {
      const translations = loadTranslations(locale, namespace);
      if (!translations) {
        if (REQUIRED_LOCALES.includes(locale)) {
          result.missingKeys.push({ locale, namespace, key: 'FILE_MISSING' });
        }
        continue;
      }

      const localeKeys = getAllKeys(translations);
      const localeKeysSet = new Set(localeKeys);

      // Claves faltantes (están en es pero no en este locale)
      for (const key of esKeys) {
        if (!localeKeysSet.has(key)) {
          if (REQUIRED_LOCALES.includes(locale)) {
            result.missingKeys.push({ locale, namespace, key });
          }
        }
      }

      // Claves extra (están en este locale pero no en es)
      for (const key of localeKeys) {
        if (!allKeys.has(key)) {
          result.extraKeys.push({ locale, namespace, key });
        }
      }

      // Verificar estructura (tipo de valor)
      for (const key of esKeys) {
        if (localeKeysSet.has(key)) {
          const esValue = getValueByKey(esTranslations, key);
          const localeValue = getValueByKey(translations, key);
          
          const esType = typeof esValue;
          const localeType = typeof localeValue;
          
          if (esType !== localeType) {
            result.structureMismatches.push({
              namespace,
              key,
              locales: [`es:${esType}`, `${locale}:${localeType}`],
            });
          }
        }
      }
    }
  }

  return result;
}

function printReport(result: ValidationResult) {
  console.log('\n📊 REPORTE DE VALIDACIÓN I18N\n');
  console.log('='.repeat(60));

  // Claves faltantes
  if (result.missingKeys.length > 0) {
    console.log('\n❌ CLAVES FALTANTES (en locales requeridos es/en):');
    console.log('-'.repeat(60));
    const grouped = result.missingKeys.reduce((acc, item) => {
      const key = `${item.locale}:${item.namespace}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.key);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [group, keys] of Object.entries(grouped)) {
      console.log(`\n  ${group}:`);
      keys.forEach(key => {
        console.log(`    - ${key}`);
      });
    }
    console.log(`\n  Total: ${result.missingKeys.length} claves faltantes`);
  } else {
    console.log('\n✅ No hay claves faltantes en locales requeridos');
  }

  // Claves extra
  if (result.extraKeys.length > 0) {
    console.log('\n⚠️  CLAVES EXTRA (en otros locales pero no en es):');
    console.log('-'.repeat(60));
    const grouped = result.extraKeys.reduce((acc, item) => {
      const key = `${item.locale}:${item.namespace}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.key);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [group, keys] of Object.entries(grouped)) {
      console.log(`\n  ${group}:`);
      keys.forEach(key => {
        console.log(`    - ${key}`);
      });
    }
    console.log(`\n  Total: ${result.extraKeys.length} claves extra`);
  } else {
    console.log('\n✅ No hay claves extra');
  }

  // Estructura inconsistente
  if (result.structureMismatches.length > 0) {
    console.log('\n⚠️  INCONSISTENCIAS DE ESTRUCTURA:');
    console.log('-'.repeat(60));
    result.structureMismatches.forEach(item => {
      console.log(`  ${item.namespace}.${item.key}: ${item.locales.join(' vs ')}`);
    });
    console.log(`\n  Total: ${result.structureMismatches.length} inconsistencias`);
  } else {
    console.log('\n✅ No hay inconsistencias de estructura');
  }

  console.log('\n' + '='.repeat(60));
  
  // Resumen
  const hasErrors = result.missingKeys.length > 0;
  const hasWarnings = result.extraKeys.length > 0 || result.structureMismatches.length > 0;
  
  if (hasErrors) {
    console.log('\n❌ VALIDACIÓN FALLIDA: Hay claves faltantes en locales requeridos');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️  VALIDACIÓN CON ADVERTENCIAS: Revisa claves extra o inconsistencias');
    process.exit(0);
  } else {
    console.log('\n✅ VALIDACIÓN EXITOSA: Todas las claves están presentes');
    process.exit(0);
  }
}

// Ejecutar validación
const result = validateI18n();
printReport(result);
