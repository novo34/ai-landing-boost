import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import {
  EncryptedBlobV1,
  CryptoContext,
  EncryptOptions,
} from './crypto.types';
import {
  KeyMissingException,
  DecryptFailedException,
  InvalidBlobException,
} from './crypto.errors';

/**
 * Helper centralizado para cifrado/descifrado
 * 
 * TODOS los cifrados/descifrados del SaaS deben pasar por este helper.
 * Prohibido usar crypto directamente en otros módulos.
 */
export class CryptoHelper {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96 bits para GCM
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly KEY_LENGTH = 32; // 256 bits

  /**
   * Obtiene la clave de cifrado para una versión específica
   */
  private static getKey(keyVersion: number): Buffer {
    const keyEnv = `ENCRYPTION_KEY_V${keyVersion}`;
    const keyB64 = process.env[keyEnv];

    if (!keyB64) {
      throw new KeyMissingException(keyVersion);
    }

    try {
      const key = Buffer.from(keyB64, 'base64');
      if (key.length !== this.KEY_LENGTH) {
        throw new Error(`Key must be ${this.KEY_LENGTH} bytes`);
      }
      return key;
    } catch (error) {
      throw new KeyMissingException(keyVersion);
    }
  }

  /**
   * Obtiene la versión activa de clave
   */
  private static getActiveKeyVersion(): number {
    const version = process.env.ENCRYPTION_ACTIVE_KEY_VERSION;
    if (!version) {
      // Default a v1 si no está configurado
      return 1;
    }
    return parseInt(version, 10);
  }

  /**
   * Genera AAD (Additional Authenticated Data) para context binding
   */
  private static generateAAD(context: CryptoContext): string {
    return `tenant:${context.tenantId}|rec:${context.recordId}`;
  }

  /**
   * Cifra un payload JSON
   */
  static encryptJson<T extends object>(
    payload: T,
    context: CryptoContext,
    options: EncryptOptions = {},
  ): EncryptedBlobV1 {
    const keyVersion = options.keyVersion || this.getActiveKeyVersion();
    const key = this.getKey(keyVersion);

    // Serializar payload a JSON
    const plaintext = JSON.stringify(payload);
    const plaintextBuffer = Buffer.from(plaintext, 'utf8');

    // Generar IV aleatorio
    const iv = randomBytes(this.IV_LENGTH);

    // Crear cipher
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    // Configurar AAD para context binding
    const aad = this.generateAAD(context);
    cipher.setAAD(Buffer.from(aad, 'utf8'));

    // Cifrar
    const ciphertext = Buffer.concat([
      cipher.update(plaintextBuffer),
      cipher.final(),
    ]);

    // Obtener tag de autenticación
    const tag = cipher.getAuthTag();

    // Construir blob
    return {
      v: 1,
      alg: this.ALGORITHM,
      keyVersion,
      ivB64: iv.toString('base64'),
      tagB64: tag.toString('base64'),
      ctB64: ciphertext.toString('base64'),
    };
  }

  /**
   * Descifra un blob y devuelve el payload JSON
   */
  static decryptJson<T extends object>(
    blob: EncryptedBlobV1,
    context: CryptoContext,
  ): T {
    // Validar formato
    if (!blob || blob.v !== 1 || blob.alg !== this.ALGORITHM) {
      throw new InvalidBlobException();
    }

    // Obtener clave
    const key = this.getKey(blob.keyVersion);

    // Decodificar componentes
    let iv: Buffer;
    let tag: Buffer;
    let ciphertext: Buffer;

    try {
      iv = Buffer.from(blob.ivB64, 'base64');
      tag = Buffer.from(blob.tagB64, 'base64');
      ciphertext = Buffer.from(blob.ctB64, 'base64');
    } catch (error) {
      throw new InvalidBlobException();
    }

    // Validar tamaños
    if (iv.length !== this.IV_LENGTH || tag.length !== this.TAG_LENGTH) {
      throw new InvalidBlobException();
    }

    // Crear decipher
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Configurar AAD para verificar context binding
    const aad = this.generateAAD(context);
    decipher.setAAD(Buffer.from(aad, 'utf8'));

    // Descifrar
    let plaintext: Buffer;
    try {
      plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
    } catch (error) {
      // Fallo de autenticación (tamper, AAD mismatch, etc.)
      throw new DecryptFailedException('Authentication failed: context mismatch or tampered data');
    }

    // Parsear JSON
    try {
      const jsonString = plaintext.toString('utf8');
      return JSON.parse(jsonString) as T;
    } catch (error) {
      throw new DecryptFailedException('Failed to parse decrypted payload');
    }
  }

  /**
   * Cifra un string (para casos especiales)
   */
  static encryptString(
    plaintext: string,
    context: CryptoContext,
    options: EncryptOptions = {},
  ): EncryptedBlobV1 {
    return this.encryptJson({ value: plaintext }, context, options);
  }

  /**
   * Descifra un blob y devuelve string
   */
  static decryptString(
    blob: EncryptedBlobV1,
    context: CryptoContext,
  ): string {
    const payload = this.decryptJson<{ value: string }>(blob, context);
    return payload.value;
  }

  /**
   * Verifica si un blob necesita migración (on-read migration)
   */
  static needsMigration(blob: EncryptedBlobV1): boolean {
    const activeVersion = this.getActiveKeyVersion();
    return blob.keyVersion < activeVersion;
  }

  /**
   * Migra un blob a la versión activa de clave
   */
  static migrateBlob<T extends object>(
    blob: EncryptedBlobV1,
    context: CryptoContext,
  ): EncryptedBlobV1 {
    // Descifrar con versión antigua
    const payload = this.decryptJson<T>(blob, context);
    
    // Cifrar con versión activa
    return this.encryptJson(payload, context, {
      keyVersion: this.getActiveKeyVersion(),
    });
  }
}
