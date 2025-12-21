import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CryptoHelper } from './crypto.helper';
import {
  EncryptedBlobV1,
  CryptoContext,
  EncryptOptions,
} from './crypto.types';
import { SecureLogger } from './utils/secure-logger.util';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly secureLogger = new SecureLogger();

  /**
   * Cifra un payload JSON
   */
  encryptJson<T extends object>(
    payload: T,
    context: CryptoContext,
    options?: EncryptOptions,
  ): EncryptedBlobV1 {
    try {
      const blob = CryptoHelper.encryptJson(payload, context, options);
      
      this.secureLogger.debug(
        this.logger,
        `Encrypt success for tenant:${context.tenantId} record:${context.recordId} keyVersion:${blob.keyVersion}`,
        { context, keyVersion: blob.keyVersion },
      );
      
      return blob;
    } catch (error: any) {
      this.secureLogger.error(
        this.logger,
        `Encrypt failed for tenant:${context.tenantId} record:${context.recordId}`,
        { context, error: error.message },
      );
      throw error;
    }
  }

  /**
   * Descifra un blob y devuelve el payload JSON
   */
  decryptJson<T extends object>(
    blob: EncryptedBlobV1,
    context: CryptoContext,
  ): T {
    try {
      const payload = CryptoHelper.decryptJson<T>(blob, context);
      
      this.secureLogger.debug(
        this.logger,
        `Decrypt success for tenant:${context.tenantId} record:${context.recordId}`,
        { context, keyVersion: blob.keyVersion },
      );
      
      // Migración on-read si está habilitada
      if (
        process.env.ENCRYPTION_MIGRATION_ON_READ === 'true' &&
        CryptoHelper.needsMigration(blob)
      ) {
        this.logger.debug(
          `Migrating blob from v${blob.keyVersion} to active version for tenant:${context.tenantId} record:${context.recordId}`,
        );
        // Nota: La migración debe ser manejada por el servicio que llama
        // para actualizar el blob en BD
      }
      
      return payload;
    } catch (error: any) {
      this.secureLogger.error(
        this.logger,
        `Decrypt failed for tenant:${context.tenantId} record:${context.recordId} reason:${error.message}`,
        { context, keyVersion: blob.keyVersion },
      );
      throw error;
    }
  }

  /**
   * Verifica si un blob necesita migración
   */
  needsMigration(blob: EncryptedBlobV1): boolean {
    return CryptoHelper.needsMigration(blob);
  }

  /**
   * Migra un blob a la versión activa
   */
  migrateBlob<T extends object>(
    blob: EncryptedBlobV1,
    context: CryptoContext,
  ): EncryptedBlobV1 {
    return CryptoHelper.migrateBlob<T>(blob, context);
  }

  /**
   * Enmascara un texto mostrando solo los últimos 4 caracteres
   * Útil para mostrar credenciales parcialmente en UI
   * 
   * @param text Texto a enmascarar
   * @returns Texto enmascarado (ej: "****-****-****-abc1")
   */
  mask(text: string | null | undefined): string {
    if (!text || text.length === 0) return '****';
    if (text.length <= 4) return '****';
    return `****-****-****-${text.slice(-4)}`;
  }

  /**
   * Genera un hash para auditoría (no reversible)
   * Útil para registrar cambios sin exponer valores reales
   * 
   * @param plaintext Texto a hashear
   * @returns Hash SHA-256 en hex
   */
  hashForAudit(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }
}
