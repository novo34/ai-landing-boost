/**
 * Script de migración de datos legacy a EncryptedBlobV1
 * 
 * Este script migra todos los datos cifrados en formato legacy (string)
 * al nuevo formato EncryptedBlobV1 usando CryptoService.
 * 
 * Variables de entorno:
 * - CRYPTO_MIGRATION_DRY_RUN=true (default: false) - Solo simula, no actualiza BD
 * - CRYPTO_MIGRATION_BATCH_SIZE=N (default: 100) - Tamaño de lote para procesamiento
 * 
 * Uso:
 *   CRYPTO_MIGRATION_DRY_RUN=true npm run migrate-crypto-legacy
 *   CRYPTO_MIGRATION_BATCH_SIZE=50 npm run migrate-crypto-legacy
 * 
 * MODO DEV RESET:
 * Si ENCRYPTION_KEY no está presente, el script ejecutará modo DEV RESET:
 * - Limpia campos legacy sin intentar descifrarlos
 * - Marca registros como desconectados/requieren reconexión
 * - Permite que el sistema funcione solo con formato nuevo
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CryptoHelper } from '../src/modules/crypto/crypto.helper';
import { EncryptedBlobV1, CryptoContext } from '../src/modules/crypto/crypto.types';

const prisma = new PrismaClient();

// Cargar .env.local si existe
const envLocalPath = path.join(__dirname, '..', '.env.local');
const hadEncryptionKeyBefore = !!process.env.ENCRYPTION_KEY;
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    // Ignorar líneas vacías y comentarios
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Solo cargar si no existe ya en process.env (para no sobrescribir variables del sistema)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}
const hasEncryptionKeyAfter = !!process.env.ENCRYPTION_KEY;
if (hasEncryptionKeyAfter && !hadEncryptionKeyBefore) {
  console.log('ℹ️  ENCRYPTION_KEY cargada desde .env.local');
} else if (hasEncryptionKeyAfter && hadEncryptionKeyBefore) {
  console.log('ℹ️  ENCRYPTION_KEY ya estaba definida en el entorno (no se cargó desde .env.local)');
}

// Configuración
const DRY_RUN = process.env.CRYPTO_MIGRATION_DRY_RUN === 'true';
const BATCH_SIZE = parseInt(process.env.CRYPTO_MIGRATION_BATCH_SIZE || '100', 10);

// Estadísticas
interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  reset: number; // Registros reseteados en modo DEV RESET
  errorDetails: Array<{ table: string; id: string; error: string }>;
}

const stats: MigrationStats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  reset: 0,
  errorDetails: [],
};

// Modo DEV RESET se detecta en main() después de cargar .env.local

// ============================================================================
// HELPERS PARA DECRYPT LEGACY
// ============================================================================

/**
 * Decrypt usando formato legacy de EncryptionUtil (iv:authTag:encrypted en hex)
 */
function decryptLegacyEncryptionUtil(encryptedText: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Obtener clave
  let key: Buffer;
  if (encryptionKey.length === 64) {
    key = Buffer.from(encryptionKey, 'hex');
  } else {
    key = crypto.createHash('sha256').update(encryptionKey).digest();
  }

  // Parsear formato: iv:authTag:encrypted
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted text format (expected iv:authTag:encrypted)');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Decrypt usando formato legacy de EmailCryptoService (iv:tag:ciphertext en base64)
 */
function decryptLegacyEmailCrypto(encrypted: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Obtener clave
  let keyBuffer: Buffer;
  if (key.length === 64) {
    keyBuffer = Buffer.from(key, 'hex');
  } else {
    keyBuffer = Buffer.from(key, 'base64');
  }

  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes');
  }

  // Parsear formato: iv:tag:ciphertext (todo en base64)
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format (expected iv:tag:ciphertext)');
  }

  const [ivBase64, tagBase64, ciphertext] = parts;
  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Detecta si un valor es formato legacy (string) o nuevo (EncryptedBlobV1)
 */
function isLegacyFormat(value: any): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // EncryptedBlobV1 es un objeto JSON con v: 1
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && parsed.v === 1 && parsed.alg === 'aes-256-gcm') {
      return false; // Es formato nuevo
    }
  } catch {
    // No es JSON válido, probablemente es legacy
  }

  // Si es string y tiene formato iv:tag:encrypted o iv:authTag:encrypted
  if (typeof value === 'string' && value.includes(':')) {
    const parts = value.split(':');
    if (parts.length === 3) {
      return true; // Probablemente es legacy
    }
  }

  return false;
}

/**
 * Detecta el tipo de formato legacy
 */
function detectLegacyFormat(value: string): 'encryption-util' | 'email-crypto' | 'unknown' {
  const parts = value.split(':');
  if (parts.length !== 3) {
    return 'unknown';
  }

  // EncryptionUtil usa hex (iv y authTag son hex)
  // EmailCryptoService usa base64 (iv y tag son base64)
  try {
    // Intentar parsear como hex (EncryptionUtil)
    Buffer.from(parts[0], 'hex');
    Buffer.from(parts[1], 'hex');
    return 'encryption-util';
  } catch {
    // Intentar parsear como base64 (EmailCryptoService)
    try {
      Buffer.from(parts[0], 'base64');
      Buffer.from(parts[1], 'base64');
      return 'email-crypto';
    } catch {
      return 'unknown';
    }
  }
}

// ============================================================================
// FUNCIONES DEV RESET (limpiar legacy sin descifrar)
// ============================================================================

/**
 * Resetea credenciales legacy de WhatsApp (DEV RESET)
 */
async function resetWhatsAppAccounts(): Promise<void> {
  console.log('\n📱 [DEV RESET] Limpiando credenciales legacy de WhatsApp...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const accounts = await prisma.tenantwhatsappaccount.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (accounts.length === 0) {
      hasMore = false;
      break;
    }

    for (const account of accounts) {
      // Filtrar en memoria: solo procesar si tiene credentials
      if (!account.credentials) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const credentials = account.credentials as any;

        // Solo resetear si es legacy
        if (!isLegacyFormat(credentials)) {
          stats.skipped++;
          continue;
        }

        // Marcar como desconectado sin modificar credentials
        // Las credentials legacy se mantienen pero el status DISCONNECTED evita que se usen
        // Cuando el usuario reconecte, se guardarán con el formato nuevo
        if (!DRY_RUN) {
          await prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: 'DISCONNECTED',
            },
          });
        }

        stats.reset++;
        console.log(`  🔄 Reset account ${account.id} (tenant: ${account.tenantId}) - requiere reconexión`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        stats.errorDetails.push({
          table: 'tenantwhatsappaccount',
          id: account.id,
          error: errorMsg,
        });
        console.error(`  ❌ Error en account ${account.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (accounts.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

/**
 * Resetea tokens OAuth (DEV RESET)
 */
async function resetOAuthTokens(): Promise<void> {
  console.log('\n🔐 [DEV RESET] Limpiando tokens OAuth legacy...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const identities = await prisma.useridentity.findMany({
      take: BATCH_SIZE,
      skip: skip,
      where: {
        OR: [
          { accessToken: { not: null } },
          { refreshToken: { not: null } },
        ],
      },
    });

    if (identities.length === 0) {
      hasMore = false;
      break;
    }

    for (const identity of identities) {
      const needsReset = 
        (identity.accessToken && isLegacyFormat(identity.accessToken)) ||
        (identity.refreshToken && isLegacyFormat(identity.refreshToken));

      if (!needsReset) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const updateData: any = {};
        if (identity.accessToken && isLegacyFormat(identity.accessToken)) {
          updateData.accessToken = null;
        }
        if (identity.refreshToken && isLegacyFormat(identity.refreshToken)) {
          updateData.refreshToken = null;
        }

        if (!DRY_RUN && Object.keys(updateData).length > 0) {
          await prisma.useridentity.update({
            where: { id: identity.id },
            data: updateData,
          });
        }

        stats.reset++;
        console.log(`  🔄 Reset tokens de identity ${identity.id} - requiere reconexión`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error en identity ${identity.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (identities.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

/**
 * Resetea credenciales de Calendar (DEV RESET)
 */
async function resetCalendarIntegrations(): Promise<void> {
  console.log('\n📅 [DEV RESET] Limpiando credenciales de Calendar legacy...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const integrations = await prisma.calendarintegration.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (integrations.length === 0) {
      hasMore = false;
      break;
    }

    for (const integration of integrations) {
      // Filtrar en memoria: solo procesar si tiene credentials
      if (!integration.credentials) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const credentials = integration.credentials as any;

        // Solo resetear si es legacy
        if (!isLegacyFormat(credentials)) {
          stats.skipped++;
          continue;
        }

        // Marcar como desconectado sin modificar credentials
        // Las credentials legacy se mantienen pero el status DISCONNECTED evita que se usen
        // Cuando el usuario reconecte, se guardarán con el formato nuevo
        if (!DRY_RUN) {
          await prisma.calendarintegration.update({
            where: { id: integration.id },
            data: {
              status: 'DISCONNECTED',
            },
          });
        }

        stats.reset++;
        console.log(`  🔄 Reset integration ${integration.id} (tenant: ${integration.tenantId}) - requiere reconexión`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error en integration ${integration.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (integrations.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

/**
 * Resetea passwords SMTP (DEV RESET)
 */
async function resetSmtpPasswords(): Promise<void> {
  console.log('\n📧 [DEV RESET] Limpiando passwords SMTP legacy...');

  // Resetear tenantsmtpsettings
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const settings = await (prisma as any).tenantsmtpsettings.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (settings.length === 0) {
      hasMore = false;
      break;
    }

    for (const setting of settings) {
      // Filtrar en memoria: solo procesar si tiene password
      if (!setting.password) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const password = setting.password as any;

        // Solo resetear si es legacy
        if (!isLegacyFormat(password)) {
          stats.skipped++;
          continue;
        }

        // Desactivar SMTP (password no puede ser null, se deja como está pero se desactiva)
        // El sistema detectará que necesita reconexión al intentar usar SMTP
        if (!DRY_RUN) {
          await (prisma as any).tenantsmtpsettings.update({
            where: { id: setting.id },
            data: {
              isActive: false,
            },
          });
        }

        stats.reset++;
        console.log(`  🔄 Reset tenant SMTP ${setting.id} (tenant: ${setting.tenantId}) - requiere reconexión`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error en tenant SMTP ${setting.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (settings.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  // Resetear platformsmtpsettings (platform SMTP)
  skip = 0;
  hasMore = true;

  while (hasMore) {
    const settings = await (prisma as any).platformsmtpsettings.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (settings.length === 0) {
      hasMore = false;
      break;
    }

    for (const setting of settings) {
      // Filtrar en memoria: solo procesar si tiene password
      if (!setting.password) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const password = setting.password as any;

        // Solo resetear si es legacy
        if (!isLegacyFormat(password)) {
          stats.skipped++;
          continue;
        }

        // Desactivar SMTP (password no puede ser null, se deja como está pero se desactiva)
        // El sistema detectará que necesita reconexión al intentar usar SMTP
        if (!DRY_RUN) {
          await (prisma as any).platformsmtpsettings.update({
            where: { id: setting.id },
            data: {
              isActive: false,
            },
          });
        }

        stats.reset++;
        console.log(`  🔄 Reset platform SMTP ${setting.id} - requiere reconexión`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error en platform SMTP ${setting.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (settings.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

// ============================================================================
// MIGRACIÓN DE TABLAS (modo normal con ENCRYPTION_KEY)
// ============================================================================

/**
 * Migra credenciales de WhatsApp (tenantwhatsappaccount)
 */
async function migrateWhatsAppAccounts(): Promise<void> {
  console.log('\n📱 Migrando credenciales de WhatsApp...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const accounts = await prisma.tenantwhatsappaccount.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (accounts.length === 0) {
      hasMore = false;
      break;
    }

    for (const account of accounts) {
      // Filtrar en memoria: solo procesar si tiene credentials
      if (!account.credentials) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const credentials = account.credentials as any;

        // Verificar si es legacy
        if (!isLegacyFormat(credentials)) {
          stats.skipped++;
          continue;
        }

        // Decrypt legacy
        const legacyFormat = detectLegacyFormat(credentials as string);
        let decryptedJson: any;

        if (legacyFormat === 'encryption-util') {
          try {
            const decrypted = decryptLegacyEncryptionUtil(credentials as string);
            decryptedJson = JSON.parse(decrypted);
          } catch (decryptError: any) {
            // Si no se puede descifrar (clave incorrecta, formato corrupto, etc.)
            // En modo DEV RESET, esto no debería pasar, pero si pasa, saltamos
            throw new Error(`No se pudo descifrar legacy: ${decryptError.message}`);
          }
        } else {
          console.error(`⚠️  Account ${account.id}: Formato legacy desconocido`);
          stats.errors++;
          stats.errorDetails.push({
            table: 'tenantwhatsappaccount',
            id: account.id,
            error: `Formato legacy desconocido: ${legacyFormat}`,
          });
          continue;
        }

        // Encrypt con CryptoService
        const context: CryptoContext = {
          tenantId: account.tenantId,
          recordId: account.id,
        };

        const newBlob = CryptoHelper.encryptJson(decryptedJson, context);

        // Actualizar en BD
        if (!DRY_RUN) {
          await prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: { credentials: newBlob as any },
          });
        }

        stats.migrated++;
        console.log(`  ✅ Migrado account ${account.id} (tenant: ${account.tenantId})`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        stats.errorDetails.push({
          table: 'tenantwhatsappaccount',
          id: account.id,
          error: errorMsg,
        });
        console.error(`  ❌ Error en account ${account.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (accounts.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

/**
 * Migra tokens OAuth (useridentity)
 */
async function migrateOAuthTokens(): Promise<void> {
  console.log('\n🔐 Migrando tokens OAuth...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const identities = await prisma.useridentity.findMany({
      take: BATCH_SIZE,
      skip: skip,
      where: {
        OR: [
          { accessToken: { not: null } },
          { refreshToken: { not: null } },
        ],
      },
    });

    if (identities.length === 0) {
      hasMore = false;
      break;
    }

    for (const identity of identities) {
      // Migrar accessToken
      if (identity.accessToken && isLegacyFormat(identity.accessToken)) {
        stats.total++;
        try {
          const legacyFormat = detectLegacyFormat(identity.accessToken as string);
          let decrypted: string;

          if (legacyFormat === 'encryption-util') {
            try {
              decrypted = decryptLegacyEncryptionUtil(identity.accessToken as string);
            } catch (decryptError: any) {
              throw new Error(`No se pudo descifrar legacy: ${decryptError.message}`);
            }
          } else {
            console.error(`⚠️  Identity ${identity.id}: Formato legacy desconocido para accessToken`);
            stats.errors++;
            continue;
          }

          // Obtener tenantId del usuario
          const user = await prisma.user.findUnique({
            where: { id: identity.userId },
            include: { tenantmembership: true },
          });

          const tenantId = user?.tenantmembership[0]?.tenantId || 'system';

          const context: CryptoContext = {
            tenantId,
            recordId: identity.id,
          };

          const newBlob = CryptoHelper.encryptJson({ token: decrypted }, context);

          if (!DRY_RUN) {
            await prisma.useridentity.update({
              where: { id: identity.id },
              data: { accessToken: newBlob as any },
            });
          }

          stats.migrated++;
          console.log(`  ✅ Migrado accessToken de identity ${identity.id}`);
        } catch (error: any) {
          stats.errors++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`  ❌ Error en identity ${identity.id} accessToken: ${errorMsg}`);
        }
      }

      // Migrar refreshToken
      if (identity.refreshToken && isLegacyFormat(identity.refreshToken)) {
        stats.total++;
        try {
          const legacyFormat = detectLegacyFormat(identity.refreshToken as string);
          let decrypted: string;

          if (legacyFormat === 'encryption-util') {
            try {
              decrypted = decryptLegacyEncryptionUtil(identity.refreshToken as string);
            } catch (decryptError: any) {
              throw new Error(`No se pudo descifrar legacy: ${decryptError.message}`);
            }
          } else {
            console.error(`⚠️  Identity ${identity.id}: Formato legacy desconocido para refreshToken`);
            stats.errors++;
            continue;
          }

          // Obtener tenantId del usuario
          const user = await prisma.user.findUnique({
            where: { id: identity.userId },
            include: { tenantmembership: true },
          });

          const tenantId = user?.tenantmembership[0]?.tenantId || 'system';

          const context: CryptoContext = {
            tenantId,
            recordId: identity.id,
          };

          const newBlob = CryptoHelper.encryptJson({ token: decrypted }, context);

          if (!DRY_RUN) {
            await prisma.useridentity.update({
              where: { id: identity.id },
              data: { refreshToken: newBlob as any },
            });
          }

          stats.migrated++;
          console.log(`  ✅ Migrado refreshToken de identity ${identity.id}`);
        } catch (error: any) {
          stats.errors++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`  ❌ Error en identity ${identity.id} refreshToken: ${errorMsg}`);
        }
      }
    }

    skip += BATCH_SIZE;
    if (identities.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

/**
 * Migra credenciales de Calendar (calendarintegration)
 */
async function migrateCalendarIntegrations(): Promise<void> {
  console.log('\n📅 Migrando credenciales de Calendar...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const integrations = await prisma.calendarintegration.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (integrations.length === 0) {
      hasMore = false;
      break;
    }

    for (const integration of integrations) {
      // Filtrar en memoria: solo procesar si tiene credentials
      if (!integration.credentials) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const credentials = integration.credentials as any;

        // Verificar si es legacy
        if (!isLegacyFormat(credentials)) {
          stats.skipped++;
          continue;
        }

        // Decrypt legacy
        const legacyFormat = detectLegacyFormat(credentials as string);
        let decryptedJson: any;

        if (legacyFormat === 'encryption-util') {
          try {
            const decrypted = decryptLegacyEncryptionUtil(credentials as string);
            decryptedJson = JSON.parse(decrypted);
          } catch (decryptError: any) {
            throw new Error(`No se pudo descifrar legacy: ${decryptError.message}`);
          }
        } else {
          console.error(`⚠️  Integration ${integration.id}: Formato legacy desconocido`);
          stats.errors++;
          continue;
        }

        // Encrypt con CryptoService
        const context: CryptoContext = {
          tenantId: integration.tenantId,
          recordId: integration.id,
        };

        const newBlob = CryptoHelper.encryptJson(decryptedJson, context);

        // Actualizar en BD
        if (!DRY_RUN) {
          await prisma.calendarintegration.update({
            where: { id: integration.id },
            data: { credentials: newBlob as any },
          });
        }

        stats.migrated++;
        console.log(`  ✅ Migrado integration ${integration.id} (tenant: ${integration.tenantId})`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error en integration ${integration.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (integrations.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

/**
 * Migra passwords SMTP (tenantsmtpsettings y platformsmtpsettings)
 */
async function migrateSmtpPasswords(): Promise<void> {
  console.log('\n📧 Migrando passwords SMTP...');

  // Migrar tenantsmtpsettings
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const settings = await (prisma as any).tenantsmtpsettings.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (settings.length === 0) {
      hasMore = false;
      break;
    }

    for (const setting of settings) {
      // Filtrar en memoria: solo procesar si tiene password
      if (!setting.password) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const password = setting.password as any;

        // Verificar si es legacy
        if (!isLegacyFormat(password)) {
          stats.skipped++;
          continue;
        }

        // Decrypt legacy (EmailCryptoService)
        const legacyFormat = detectLegacyFormat(password as string);
        let decrypted: string;

        if (legacyFormat === 'email-crypto') {
          try {
            decrypted = decryptLegacyEmailCrypto(password as string);
          } catch (decryptError: any) {
            throw new Error(`No se pudo descifrar legacy: ${decryptError.message}`);
          }
        } else {
          console.error(`⚠️  Setting ${setting.id}: Formato legacy desconocido`);
          stats.errors++;
          continue;
        }

        // Encrypt con CryptoService
        const context: CryptoContext = {
          tenantId: setting.tenantId,
          recordId: setting.id || `tenant-smtp-${setting.tenantId}`,
        };

        const newBlob = CryptoHelper.encryptJson({ password: decrypted }, context);

        // Actualizar en BD
        if (!DRY_RUN) {
          await (prisma as any).tenantsmtpsettings.update({
            where: { id: setting.id },
            data: { password: newBlob },
          });
        }

        stats.migrated++;
        console.log(`  ✅ Migrado tenant SMTP ${setting.id} (tenant: ${setting.tenantId})`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error en tenant SMTP ${setting.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (settings.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  // Migrar platformsmtpsettings (platform SMTP)
  skip = 0;
  hasMore = true;

  while (hasMore) {
    const settings = await (prisma as any).platformsmtpsettings.findMany({
      take: BATCH_SIZE,
      skip: skip,
    });

    if (settings.length === 0) {
      hasMore = false;
      break;
    }

    for (const setting of settings) {
      // Filtrar en memoria: solo procesar si tiene password
      if (!setting.password) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        const password = setting.password as any;

        // Verificar si es legacy
        if (!isLegacyFormat(password)) {
          stats.skipped++;
          continue;
        }

        // Decrypt legacy (EmailCryptoService)
        const legacyFormat = detectLegacyFormat(password as string);
        let decrypted: string;

        if (legacyFormat === 'email-crypto') {
          try {
            decrypted = decryptLegacyEmailCrypto(password as string);
          } catch (decryptError: any) {
            throw new Error(`No se pudo descifrar legacy: ${decryptError.message}`);
          }
        } else {
          console.error(`⚠️  Setting ${setting.id}: Formato legacy desconocido`);
          stats.errors++;
          continue;
        }

        // Encrypt con CryptoService (recordId = settings.id para platform SMTP)
        const context: CryptoContext = {
          tenantId: 'platform', // Platform SMTP no tiene tenantId
          recordId: setting.id,
        };

        const newBlob = CryptoHelper.encryptJson({ password: decrypted }, context);

        // Actualizar en BD
        if (!DRY_RUN) {
          await (prisma as any).platformsmtpsettings.update({
            where: { id: setting.id },
            data: { password: newBlob },
          });
        }

        stats.migrated++;
        console.log(`  ✅ Migrado platform SMTP ${setting.id}`);
      } catch (error: any) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error en platform SMTP ${setting.id}: ${errorMsg}`);
      }
    }

    skip += BATCH_SIZE;
    if (settings.length < BATCH_SIZE) {
      hasMore = false;
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Detectar modo DEV RESET después de cargar .env.local
  // Se puede forzar con CRYPTO_MIGRATION_FORCE_DEV_RESET=true
  const forceDevReset = process.env.CRYPTO_MIGRATION_FORCE_DEV_RESET === 'true';
  const hasEncryptionKey = process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.trim() !== '';
  const DEV_RESET_MODE = forceDevReset || !hasEncryptionKey;

  console.log('🚀 Iniciando migración de datos legacy a EncryptedBlobV1');
  console.log(`📊 Configuración:`);
  console.log(`   - DRY_RUN: ${DRY_RUN}`);
  console.log(`   - BATCH_SIZE: ${BATCH_SIZE}`);
  console.log(`   - ENCRYPTION_KEY presente: ${hasEncryptionKey ? 'SÍ' : 'NO'}`);
  console.log(`   - DEV_RESET_MODE: ${DEV_RESET_MODE}`);

  if (DRY_RUN) {
    console.log('\n⚠️  MODO DRY-RUN: No se actualizará la base de datos');
  }

  if (DEV_RESET_MODE) {
    if (forceDevReset) {
      console.log('\n🔄 MODO DEV RESET FORZADO: CRYPTO_MIGRATION_FORCE_DEV_RESET=true');
    } else {
      console.log('\n🔄 MODO DEV RESET: ENCRYPTION_KEY no encontrada');
    }
    console.log('   Se limpiarán datos legacy sin intentar descifrarlos');
    console.log('   Los usuarios deberán reconectar sus credenciales en settings');
  }

  try {
    // Verificar clave nueva (siempre requerida)
    const activeKeyVersion = parseInt(process.env.ENCRYPTION_ACTIVE_KEY_VERSION || '1', 10);
    const keyEnv = `ENCRYPTION_KEY_V${activeKeyVersion}`;
    if (!process.env[keyEnv]) {
      throw new Error(`${keyEnv} environment variable is required`);
    }

    if (DEV_RESET_MODE) {
      // Modo DEV RESET: limpiar legacy sin descifrar
      await resetWhatsAppAccounts();
      await resetOAuthTokens();
      await resetCalendarIntegrations();
      await resetSmtpPasswords();
    } else {
      // Modo normal: migrar legacy descifrando
      await migrateWhatsAppAccounts();
      await migrateOAuthTokens();
      await migrateCalendarIntegrations();
      await migrateSmtpPasswords();
    }

    // Mostrar estadísticas
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log(`   Total procesados: ${stats.total}`);
    if (DEV_RESET_MODE) {
      console.log(`   Reseteados (DEV RESET): ${stats.reset}`);
    } else {
      console.log(`   Migrados: ${stats.migrated}`);
    }
    console.log(`   Omitidos (ya en formato nuevo): ${stats.skipped}`);
    console.log(`   Errores: ${stats.errors}`);

    if (stats.errorDetails.length > 0) {
      console.log('\n❌ DETALLES DE ERRORES:');
      stats.errorDetails.forEach((detail) => {
        console.log(`   - ${detail.table} [${detail.id}]: ${detail.error}`);
      });
    }

    if (DRY_RUN) {
      console.log('\n⚠️  MODO DRY-RUN: Ejecuta sin DRY_RUN=true para aplicar cambios');
    } else {
      if (DEV_RESET_MODE) {
        console.log('\n✅ DEV RESET completado');
        console.log('   Los usuarios deberán reconectar sus credenciales en settings');
      } else {
        console.log('\n✅ Migración completada');
      }
    }

    if (stats.errors > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

