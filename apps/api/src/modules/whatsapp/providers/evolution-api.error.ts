import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Mapea statusCode de Axios a HttpStatus de NestJS
 */
function mapStatusCodeToHttpStatus(statusCode: number): HttpStatus {
  if (statusCode === 401 || statusCode === 403) {
    return HttpStatus.UNAUTHORIZED;
  }
  if (statusCode === 404) {
    return HttpStatus.NOT_FOUND;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return HttpStatus.BAD_REQUEST;
  }
  if (statusCode >= 500) {
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
  // Error de red (statusCode 0) o desconocido
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Obtiene error_key según statusCode
 */
function getErrorKey(statusCode: number): string {
  if (statusCode === 401 || statusCode === 403) {
    return 'whatsapp.invalid_credentials';
  }
  if (statusCode === 404) {
    return 'whatsapp.external_deleted';
  }
  if (statusCode === 0) {
    // Error de red (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
    return 'whatsapp.network_error';
  }
  if (statusCode >= 500) {
    return 'whatsapp.network_error';
  }
  return 'whatsapp.transient_error';
}

/**
 * Error específico de Evolution API que preserva statusCode de Axios
 */
export class EvolutionApiError extends HttpException {
  public readonly statusCode: number;
  public readonly originalError?: any;

  constructor(
    message: string,
    statusCode: number,
    originalError?: any,
  ) {
    // Calcular valores antes de llamar a super() (no usar 'this' antes de super)
    const httpStatus = mapStatusCodeToHttpStatus(statusCode);
    const errorKey = getErrorKey(statusCode);
    
    super(
      {
        success: false,
        error_key: errorKey,
        message,
      },
      httpStatus,
    );

    this.statusCode = statusCode;
    this.originalError = originalError;
  }

  /**
   * Crea EvolutionApiError desde error de Axios
   */
  static fromAxiosError(error: any): EvolutionApiError {
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Evolution API error';
    
    // Detectar errores de red
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return new EvolutionApiError(
        'Network error connecting to Evolution API',
        0, // 0 indica error de red
        error,
      );
    }

    return new EvolutionApiError(message, statusCode, error);
  }
}

