#!/usr/bin/env tsx
/**
 * Script para encontrar claves i18n usadas pero no definidas
 * Busca todos los usos de t() en el código y verifica que existan en los JSON
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const LOCALES_DIR = path.join(__dirname, '../lib/i18n/locales');
const SOURCE_DIR = path.join(__dirname, '..');
const REQUIRED_LOCALES = ['es', 'en'];

interface UsedKey {
  file: string;
  line: number;
  key: string;
  namespace?: string;
}

function getAllKeysFromJSON(obj: any, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      getAllKeysFromJSON(obj[key], fullKey).forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
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
    return null;
  }
}

function findI18nKeysInFile(filePath: string): UsedKey[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys: UsedKey[] = [];
  const lines = content.split('\n');

  // Patrones para encontrar t('key') o t("key") o t('namespace.key')
  const patterns = [
    /t\(['"]([^'"]+)['"]\)/g,
    /t\(['"]([^'"]+)['"]\s*,\s*\{[^}]*ns:\s*['"]([^'"]+)['"]/g,
  ];

  lines.forEach((line, index) => {
    // Buscar t('key')
    let match;
    const pattern1 = /t\(['"]([^'"]+)['"]\)/g;
    while ((match = pattern1.exec(line)) !== null) {
      const fullKey = match[1];
      keys.push({
        file: filePath,
        line: index + 1,
        key: fullKey,
      });
    }

    // Buscar t('key', { ns: 'namespace' })
    const pattern2 = /t\(['"]([^'"]+)['"]\s*,\s*\{[^}]*ns:\s*['"]([^'"]+)['"]/g;
    while ((match = pattern2.exec(line)) !== null) {
      keys.push({
        file: filePath,
        line: index + 1,
        key: match[1],
        namespace: match[2],
      });
    }
  });

  return keys;
}

async function findMissingKeys() {
  console.log('🔍 Buscando claves i18n usadas en el código...\n');

  // Buscar todos los archivos .tsx y .ts
  const files = await glob('**/*.{tsx,ts}', {
    cwd: SOURCE_DIR,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/scripts/**'],
  });

  const usedKeys: UsedKey[] = [];
  for (const file of files) {
    const filePath = path.join(SOURCE_DIR, file);
    if (fs.existsSync(filePath)) {
      const keys = findI18nKeysInFile(filePath);
      usedKeys.push(...keys);
    }
  }

  console.log(`📊 Encontradas ${usedKeys.length} llamadas a t()\n`);

  // Cargar todas las traducciones
  const namespaces = ['common', 'landing', 'platform'];
  const definedKeys: Record<string, Set<string>> = {};

  for (const locale of REQUIRED_LOCALES) {
    definedKeys[locale] = new Set();
    for (const namespace of namespaces) {
      const translations = loadTranslations(locale, namespace);
      if (translations) {
        const keys = getAllKeysFromJSON(translations);
        keys.forEach(key => {
          definedKeys[locale].add(`${namespace}.${key}`);
          // También agregar sin namespace para common
          if (namespace === 'common') {
            definedKeys[locale].add(key);
          }
        });
      }
    }
  }

  // Verificar claves usadas
  const missingKeys: Array<{ key: UsedKey; missingIn: string[] }> = [];
  const foundKeys = new Set<string>();

  for (const usedKey of usedKeys) {
    const keyStr = usedKey.key;
    const namespace = usedKey.namespace || 'common';
    const fullKey = namespace !== 'common' ? `${namespace}.${keyStr}` : keyStr;

    const missingIn: string[] = [];
    for (const locale of REQUIRED_LOCALES) {
      if (!definedKeys[locale].has(fullKey) && !definedKeys[locale].has(keyStr)) {
        missingIn.push(locale);
      }
    }

    if (missingIn.length > 0) {
      missingKeys.push({ key: usedKey, missingIn });
    } else {
      foundKeys.add(fullKey);
    }
  }

  // Reporte
  console.log('='.repeat(80));
  console.log('📋 REPORTE DE CLAVES FALTANTES\n');

  if (missingKeys.length > 0) {
    console.log(`❌ ${missingKeys.length} claves usadas pero NO definidas:\n`);
    
    const grouped = missingKeys.reduce((acc, item) => {
      const key = item.key.key;
      if (!acc[key]) {
        acc[key] = {
          key,
          missingIn: item.missingIn,
          locations: [],
        };
      }
      acc[key].locations.push(`${item.key.file}:${item.key.line}`);
      return acc;
    }, {} as Record<string, { key: string; missingIn: string[]; locations: string[] }>);

    for (const [key, info] of Object.entries(grouped)) {
      console.log(`  ❌ ${key}`);
      console.log(`     Faltante en: ${info.missingIn.join(', ')}`);
      console.log(`     Usado en: ${info.locations.slice(0, 3).join(', ')}${info.locations.length > 3 ? ` (+${info.locations.length - 3} más)` : ''}`);
      console.log('');
    }
  } else {
    console.log('✅ Todas las claves usadas están definidas\n');
  }

  console.log('='.repeat(80));
  console.log(`\n📊 Resumen:`);
  console.log(`   - Claves usadas: ${usedKeys.length}`);
  console.log(`   - Claves encontradas: ${foundKeys.size}`);
  console.log(`   - Claves faltantes: ${missingKeys.length}`);

  if (missingKeys.length > 0) {
    process.exit(1);
  }
}

findMissingKeys().catch(console.error);
