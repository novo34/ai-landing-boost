import * as crypto from 'crypto';

/**
 * Utilidad para validar firmas de webhooks de proveedores WhatsApp
 */
export class WebhookSignatureUtil {
  /**
   * Valida la firma de un webhook de WhatsApp Cloud API
   * 
   * WhatsApp Cloud API usa X-Hub-Signature-256 con SHA256 HMAC
   * Formato: sha256=<hash>
   * 
   * @param payload - Body del request (string o Buffer)
   * @param signature - Header X-Hub-Signature-256
   * @param secret - App Secret de WhatsApp Cloud API
   * @returns true si la firma es válida
   */
  static validateWhatsAppCloudSignature(
    payload: string | Buffer,
    signature: string | undefined,
    secret: string,
  ): boolean {
    if (!signature) {
      return false;
    }

    // El formato es: sha256=<hash>
    const signatureHash = signature.replace('sha256=', '');
    if (!signatureHash) {
      return false;
    }

    // Calcular HMAC SHA256
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload) : payload;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(payloadBuffer)
      .digest('hex');

    // Comparar hashes de forma segura (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    );
  }

  /**
   * Valida la firma de un webhook de Evolution API
   * 
   * Evolution API puede usar diferentes métodos de validación:
   * - API Key en header (ya validado por el endpoint)
   * - Webhook secret (si está configurado)
   * 
   * Por ahora, validamos que el accountId existe y pertenece al tenant correcto
   * (la validación real se hace al obtener la cuenta)
   * 
   * @param payload - Body del request
   * @param apiKey - API Key del header (opcional)
   * @param accountId - ID de la cuenta (validado en el controller)
   * @returns true si la validación básica pasa
   */
  static validateEvolutionWebhook(
    payload: unknown,
    apiKey: string | undefined,
    accountId: string,
  ): boolean {
    // Evolution API no tiene un estándar de firma de webhook como WhatsApp Cloud
    // La validación se hace mediante:
    // 1. Verificar que accountId existe y pertenece al tenant
    // 2. Opcionalmente verificar API Key si está en el header
    // 3. En producción, considerar validar IP origen o usar webhook secret si Evolution API lo soporta
    
    // Por ahora, retornamos true si hay accountId (la validación real se hace en el controller)
    return !!accountId;
  }
}
