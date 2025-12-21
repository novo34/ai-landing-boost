/**
 * Formato de blob cifrado versión 1
 */
export interface EncryptedBlobV1 {
  v: 1;
  alg: 'aes-256-gcm';
  keyVersion: number;
  ivB64: string;    // IV en base64 (12 bytes)
  tagB64: string;   // Tag de autenticación en base64 (16 bytes)
  ctB64: string;    // Ciphertext en base64
}

/**
 * Contexto para cifrado/descifrado
 */
export interface CryptoContext {
  tenantId: string;
  recordId: string;
}

/**
 * Opciones para cifrado
 */
export interface EncryptOptions {
  keyVersion?: number;  // Si no se especifica, usa la versión activa
}
