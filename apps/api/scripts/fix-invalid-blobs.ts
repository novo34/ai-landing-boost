/**
 * Script para corregir blobs inválidos creados por DEV RESET
 * 
 * Este script busca y corrige blobs EncryptedBlobV1 inválidos (con campos vacíos)
 * que fueron creados durante el modo DEV RESET.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verifica si un blob es inválido (tiene campos vacíos o _devReset)
 */
function isInvalidBlob(value: any): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && parsed.v === 1) {
      // Es un EncryptedBlobV1
      // Verificar si tiene campos vacíos o _devReset
      if (parsed._devReset || 
          !parsed.ivB64 || 
          !parsed.tagB64 || 
          !parsed.ctB64 ||
          parsed.ivB64 === '' ||
          parsed.tagB64 === '' ||
          parsed.ctB64 === '') {
        return true;
      }
    }
  } catch {
    // No es JSON válido, no es un blob inválido de nuestro tipo
    return false;
  }

  return false;
}

async function fixInvalidBlobs() {
  console.log('🔍 Buscando blobs inválidos...\n');

  // 1. Fix tenantwhatsappaccount
  console.log('📱 Verificando tenantwhatsappaccount...');
  const whatsappAccounts = await prisma.tenantwhatsappaccount.findMany();

  let fixed = 0;
  for (const account of whatsappAccounts) {
    if (!account.credentials) continue;
    
    if (isInvalidBlob(account.credentials)) {
      console.log(`  ❌ Blob inválido encontrado en account ${account.id}`);
      // Reemplazar blob inválido con string legacy vacío que el sistema detectará como "requiere reconexión"
      // El string "LEGACY_RESET_REQUIRED" será detectado como legacy y el sistema pedirá reconexión
      await prisma.tenantwhatsappaccount.update({
        where: { id: account.id },
        data: {
          status: 'DISCONNECTED',
          credentials: 'LEGACY_RESET_REQUIRED:LEGACY_RESET_REQUIRED:LEGACY_RESET_REQUIRED',
        },
      });
      fixed++;
      console.log(`  ✅ Account ${account.id} corregido y marcado como DISCONNECTED`);
    }
  }

  // 2. Fix calendarintegration
  console.log('\n📅 Verificando calendarintegration...');
  const calendarIntegrations = await prisma.calendarintegration.findMany();

  for (const integration of calendarIntegrations) {
    if (!integration.credentials) continue;
    
    if (isInvalidBlob(integration.credentials)) {
      console.log(`  ❌ Blob inválido encontrado en integration ${integration.id}`);
      // Reemplazar blob inválido con string legacy que el sistema detectará como "requiere reconexión"
      await prisma.calendarintegration.update({
        where: { id: integration.id },
        data: {
          status: 'DISCONNECTED',
          credentials: 'LEGACY_RESET_REQUIRED:LEGACY_RESET_REQUIRED:LEGACY_RESET_REQUIRED',
        },
      });
      fixed++;
      console.log(`  ✅ Integration ${integration.id} corregido y marcado como DISCONNECTED`);
    }
  }

  console.log(`\n✅ Corrección completada: ${fixed} registros corregidos`);
  console.log('   Los usuarios deberán reconectar sus credenciales en settings');
}

async function main() {
  try {
    await fixInvalidBlobs();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
