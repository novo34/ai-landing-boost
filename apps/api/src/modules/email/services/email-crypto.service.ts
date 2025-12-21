import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EmailCryptoService {
  private readonly logger = new Logger(EmailCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits para GCM
  private readonly tagLength = 16; // 128 bits para GCM tag

  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Si la key es un string, convertir a Buffer
    // Esperamos que sea hex (64 caracteres) o base64
    let keyBuffer: Buffer;
    if (key.length === 64) {
      // Hex string
      keyBuffer = Buffer.from(key, 'hex');
    } else {
      // Base64 o string directo
      keyBuffer = Buffer.from(key, 'base64');
    }

    // Asegurar que tenga exactamente 32 bytes
    if (keyBuffer.length !== this.keyLength) {
      throw new Error(
        `ENCRYPTION_KEY must be exactly ${this.keyLength} bytes (${this.keyLength * 2} hex characters or ${Math.ceil((this.keyLength * 4) / 3)} base64 characters)`,
      );
    }

    return keyBuffer;
  }

  /**
   * Cifra un texto plano usando AES-256-GCM
   * @param plaintext Texto a cifrar
   * @returns String en formato: iv:tag:ciphertext (todo en base64)
   */
  encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      const tag = cipher.getAuthTag();

      // Formato: iv:tag:ciphertext (todo en base64)
      return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext}`;
    } catch (error) {
      this.logger.error(`Encryption error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Descifra un texto cifrado usando AES-256-GCM
   * @param encrypted Formato: iv:tag:ciphertext (todo en base64)
   * @returns Texto plano
   */
  decrypt(encrypted: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encrypted.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const [ivBase64, tagBase64, ciphertext] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      this.logger.error(`Decryption error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Genera un hash para auditoría (no reversible)
   * @param plaintext Texto a hashear
   * @returns Hash SHA-256 en hex
   */
  hashForAudit(plaintext: string): string {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }
}


