import { BadRequestException } from '@nestjs/common';

/**
 * Valida y normaliza una URL base de Evolution API
 * Protege contra SSRF (Server-Side Request Forgery)
 * 
 * @param baseUrl URL a validar
 * @param allowHttp Si es true, permite http:// (por defecto solo https://)
 * @returns URL normalizada y validada
 * @throws BadRequestException si la URL es inválida o peligrosa
 */
export function validateEvolutionBaseUrl(
  baseUrl: string | undefined | null,
  allowHttp: boolean = false,
): string {
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL is required and must be a valid string',
    });
  }

  // Normalizar: trim y remover trailing slash
  let normalized = baseUrl.trim().replace(/\/+$/, '');

  if (!normalized) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL cannot be empty',
    });
  }

  // Asegurar que tenga protocolo
  if (!normalized.match(/^https?:\/\//i)) {
    // Si no tiene protocolo, asumir https://
    normalized = `https://${normalized}`;
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch (error) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Invalid URL format',
    });
  }

  // Validar protocolo
  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'https:' && (!allowHttp || protocol !== 'http:')) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL must use HTTPS protocol',
    });
  }

  // Bloquear protocolos peligrosos
  const dangerousProtocols = ['file:', 'ftp:', 'javascript:', 'data:', 'vbscript:'];
  if (dangerousProtocols.includes(protocol)) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Unsupported URL protocol',
    });
  }

  // Obtener hostname
  const hostname = url.hostname.toLowerCase();

  // Bloquear localhost y variantes
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    '0000:0000:0000:0000:0000:0000:0000:0001',
  ];
  if (localhostPatterns.includes(hostname)) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL cannot point to localhost',
    });
  }

  // Bloquear IPs privadas (RFC 1918)
  // 10.0.0.0/8
  if (hostname.match(/^10\./)) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL cannot point to private IP addresses',
    });
  }

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const private172Match = hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./);
  if (private172Match) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL cannot point to private IP addresses',
    });
  }

  // 192.168.0.0/16
  if (hostname.match(/^192\.168\./)) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL cannot point to private IP addresses',
    });
  }

  // Bloquear link-local (169.254.0.0/16)
  if (hostname.match(/^169\.254\./)) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL cannot point to link-local addresses',
    });
  }

  // Bloquear multicast (224.0.0.0/4)
  const multicastMatch = hostname.match(/^(22[4-9]|23[0-9])\./);
  if (multicastMatch) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL cannot point to multicast addresses',
    });
  }

  // Validar que el hostname no esté vacío
  if (!hostname || hostname.length === 0) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: 'Base URL must have a valid hostname',
    });
  }

  // Retornar URL normalizada (sin trailing slash)
  return normalized;
}
