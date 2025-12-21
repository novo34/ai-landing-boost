import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * EncryptionUtil
 * 
 * Utilidad para encriptar/desencriptar credenciales de WhatsApp usando AES-256-GCM.
 * Las credenciales se almacenan en formato: iv:authTag:encrypted
 */
export class EncryptionUtil {
  private static getKey(): Buffer {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Si la clave viene en hex, convertirla a Buffer
    if (encryptionKey.length === 64) {
      // 64 caracteres hex = 32 bytes
      return Buffer.from(encryptionKey, 'hex');
    }

    // Si no, derivar una clave de 32 bytes usando SHA-256
    return crypto.createHash('sha256').update(encryptionKey).digest();
  }

  /**
   * Encripta un texto usando AES-256-GCM
   * @param text Texto a encriptar
   * @returns String en formato "iv:authTag:encrypted"
   */
  static encrypt(text: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Desencripta un texto encriptado con AES-256-GCM
   * @param encryptedText Texto encriptado en formato "iv:authTag:encrypted"
   * @returns Texto desencriptado
   */
  static decrypt(encryptedText: string): string {
    const key = this.getKey();
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Enmascara un texto mostrando solo los últimos 4 caracteres
   * @param text Texto a enmascarar
   * @returns Texto enmascarado (ej: "****-****-****-abc1")
   */
  static mask(text: string): string {
    if (!text || text.length === 0) return '****';
    if (text.length <= 4) return '****';
    return `****-****-****-${text.slice(-4)}`;
  }
}

