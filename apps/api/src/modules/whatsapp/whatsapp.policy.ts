import { ForbiddenException, Logger } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { EncryptedBlobV1 } from '../crypto/crypto.types';

const logger = new Logger('WhatsAppPolicy');

/**
 * Detecta si las credenciales están en formato legacy
 */
export function isLegacyFormat(credentials: any): boolean {
  if (!credentials || typeof credentials !== 'string') {
    return false;
  }
  // Verificar si es un objeto JSON (EncryptedBlobV1) parseado como string
  try {
    const parsed = JSON.parse(credentials);
    if (parsed && typeof parsed === 'object' && parsed.v === 1 && parsed.alg === 'aes-256-gcm') {
      return false; // Es formato nuevo
    }
  } catch {
    // No es JSON válido
  }
  return true; // Es formato legacy (string con formato iv:tag:encrypted)
}

/**
 * Intenta detectar si las credenciales no se pueden desencriptar
 * (sin lanzar excepción, solo para detección)
 */
export function canDecryptCredentials(credentials: any): boolean {
  if (!credentials) return false;
  
  try {
    if (typeof credentials === 'string') {
      const parsed = JSON.parse(credentials);
      if (parsed && typeof parsed === 'object' && parsed.v === 1 && parsed.alg === 'aes-256-gcm') {
        return true; // Formato válido, puede desencriptarse
      }
    } else if (credentials.v === 1 && credentials.alg === 'aes-256-gcm') {
      return true;
    }
  } catch {
    // No es JSON válido o formato incorrecto
  }
  
  return false;
}

/**
 * Determina si una cuenta legacy owned (mismo tenant) puede operarse sin decrypt
 * Reglas:
 * - Debe ser formato legacy O no poder desencriptarse
 * - Debe pertenecer al mismo tenant (ya validado en assertAccountOwnedOrLegacyOverride)
 * - Para getInstanceStatus/disconnectInstance: permitir siempre (owned)
 * - Para deleteInstance: permitir si DISCONNECTED
 * - Para validate/reconnect: NO permitir (devolver 400 "cannot_decrypt_credentials")
 */
export function canOperateLegacyAccountWithoutDecrypt(params: {
  account: {
    tenantId: string;
    credentials: any;
    status: $Enums.tenantwhatsappaccount_status;
  };
  action: string;
}): { allowed: boolean; reason: string } {
  const { account, action } = params;
  
  // Verificar si es legacy o no se puede desencriptar
  const isLegacy = isLegacyFormat(account.credentials);
  const canDecrypt = canDecryptCredentials(account.credentials);
  
  if (!isLegacy && canDecrypt) {
    return { allowed: false, reason: 'Not legacy format and can decrypt - normal flow' };
  }
  
  // Para getInstanceStatus/disconnectInstance: permitir siempre (owned, aunque no decrypt)
  if (action === 'getInstanceStatus' || action === 'disconnectInstance') {
    logger.warn(
      `Legacy account operation ALLOWED (owned, no decrypt): tenantId=${account.tenantId}, status=${account.status}, isLegacy=${isLegacy}, canDecrypt=${canDecrypt}, action=${action}, reason=legacy_owned_operation`
    );
    return { allowed: true, reason: 'legacy_owned_operation' };
  }
  
  // Para deleteInstance: permitir si DISCONNECTED
  if (action === 'deleteInstance' || action === 'deleteAccount') {
    if (account.status === $Enums.tenantwhatsappaccount_status.CONNECTED) {
      return { allowed: false, reason: 'Legacy account is CONNECTED, must disconnect first' };
    }
    
    logger.warn(
      `Legacy account DELETE ALLOWED (owned, DISCONNECTED): tenantId=${account.tenantId}, status=${account.status}, isLegacy=${isLegacy}, canDecrypt=${canDecrypt}, action=${action}, reason=legacy_owned_delete`
    );
    return { allowed: true, reason: 'legacy_owned_delete' };
  }
  
  // Para validate/reconnect: NO permitir (devolver 400)
  return { allowed: false, reason: 'validate/reconnect require decrypt - return 400 cannot_decrypt_credentials' };
}

/**
 * Valida que instanceName pertenece al tenant
 */
export function validateInstanceName(instanceName: string, tenantId: string): boolean {
  if (!instanceName) return false;
  const prefix = `tenant-${tenantId}-`;
  return instanceName.startsWith(prefix) && instanceName.length <= 50;
}

/**
 * Assert que la cuenta pertenece al tenant
 * Ownership se determina SOLO por tenantId. InstanceName NO define permisos.
 * 
 * Para cuentas legacy owned (mismo tenant) que no se pueden desencriptar:
 * - Permitir: getInstanceStatus, disconnectInstance, deleteInstance (si DISCONNECTED)
 * - validate/reconnect deben devolver 400 "cannot_decrypt_credentials" (NO Forbidden)
 * 
 * INSTRUMENTACIÓN OBLIGATORIA: Loggea SIEMPRE antes de lanzar ForbiddenException
 * y cuando permite operaciones legacy con contexto completo.
 */
export function assertAccountOwnedOrLegacyOverride(params: {
  account: {
    id: string;
    tenantId: string;
    instanceName?: string | null;
    credentials: any;
    status: $Enums.tenantwhatsappaccount_status;
  };
  tenantId: string;
  action: string;
}): void {
  const { account, tenantId, action } = params;
  
  const isLegacy = isLegacyFormat(account.credentials);
  const canDecrypt = canDecryptCredentials(account.credentials);
  
  // OWNERSHIP: Determinar SOLO por tenantId (instanceName NO define permisos)
  if (account.tenantId !== tenantId) {
    const decisionReason = `Cross-tenant access denied (account.tenantId=${account.tenantId} !== requestedTenantId=${tenantId})`;
    logger.warn(
      `[${action}] Ownership check FAILED: accountId=${account.id}, accountTenantId=${account.tenantId}, requestedTenantId=${tenantId}, instanceName=${account.instanceName || 'null'}, status=${account.status}, isLegacy=${isLegacy}, canDecrypt=${canDecrypt}, decisionReason=${decisionReason}`
    );
    throw new ForbiddenException({
      success: false,
      error_key: 'whatsapp.instance_not_owned',
    });
  }
  
  // Ownership válido por tenantId (mismo tenant)
  logger.debug(
    `[${action}] Ownership check PASSED: accountId=${account.id}, tenantId=${tenantId}, instanceName=${account.instanceName || 'null'}, decisionReason=tenantId_match`
  );
  
  // NOTA: InstanceName se valida SOLO en creación/renombrado/creación de instancia externa,
  // NO en permisos de operación. El ownership ya está validado arriba.
}

