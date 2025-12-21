import { Logger } from '@nestjs/common';

/**
 * Utilidad para logging seguro que redacta automáticamente secretos
 */
export class SecureLogger {
  /**
   * Patrones a redactar en logs
   */
  private readonly secretPatterns = [
    /apikey/gi,
    /api[_-]?key/gi,
    /authorization/gi,
    /cookie/gi,
    /secret/gi,
    /token/gi,
    /password/gi,
    /credential/gi,
  ];

  /**
   * Campos a redactar en objetos
   */
  private readonly secretFields = [
    'apikey',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'secret',
    'token',
    'password',
    'credential',
    'credentials',
  ];

  /**
   * Redacta un string eliminando secretos
   */
  private redactString(str: string): string {
    let redacted = str;
    
    // Redactar patrones
    for (const pattern of this.secretPatterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
    
    // Redactar valores comunes (ej: "apikey: xxx" -> "apikey: [REDACTED]")
    redacted = redacted.replace(
      /(apikey|api[_-]?key|authorization|secret|token|password)\s*[:=]\s*["']?[^"'\s,}]+["']?/gi,
      '$1: [REDACTED]',
    );
    
    return redacted;
  }

  /**
   * Redacta un objeto eliminando campos sensibles
   */
  private redactObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Si el campo es sensible, redactar
      if (this.secretFields.some(field => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        redacted[key] = this.redactString(value);
      } else if (typeof value === 'object') {
        redacted[key] = this.redactObject(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Log debug seguro
   */
  debug(logger: Logger, message: string, context?: any): void {
    const redactedContext = context ? this.redactObject(context) : undefined;
    logger.debug(message, redactedContext);
  }

  /**
   * Log error seguro
   */
  error(logger: Logger, message: string, context?: any): void {
    const redactedContext = context ? this.redactObject(context) : undefined;
    logger.error(message, redactedContext);
  }

  /**
   * Log warn seguro
   */
  warn(logger: Logger, message: string, context?: any): void {
    const redactedContext = context ? this.redactObject(context) : undefined;
    logger.warn(message, redactedContext);
  }

  /**
   * Log info seguro
   */
  info(logger: Logger, message: string, context?: any): void {
    const redactedContext = context ? this.redactObject(context) : undefined;
    logger.log(message, redactedContext);
  }
}
