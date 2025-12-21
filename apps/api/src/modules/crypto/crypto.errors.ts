import { HttpException, HttpStatus } from '@nestjs/common';

export enum CryptoErrorCode {
  UNSUPPORTED_VERSION = 'CRYPTO_UNSUPPORTED_VERSION',
  KEY_MISSING = 'CRYPTO_KEY_MISSING',
  DECRYPT_FAILED = 'CRYPTO_DECRYPT_FAILED',
  INVALID_BLOB = 'CRYPTO_INVALID_BLOB',
  INVALID_CONTEXT = 'CRYPTO_INVALID_CONTEXT',
}

export class CryptoException extends HttpException {
  constructor(
    public readonly code: CryptoErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        success: false,
        error_key: code,
        error_params: { message },
      },
      status,
    );
  }
}

export class UnsupportedVersionException extends CryptoException {
  constructor(version: number) {
    super(
      CryptoErrorCode.UNSUPPORTED_VERSION,
      `Unsupported blob version: ${version}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class KeyMissingException extends CryptoException {
  constructor(keyVersion: number) {
    super(
      CryptoErrorCode.KEY_MISSING,
      `Encryption key version ${keyVersion} not found`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class DecryptFailedException extends CryptoException {
  constructor(reason: string = 'Decryption failed') {
    super(
      CryptoErrorCode.DECRYPT_FAILED,
      reason,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidBlobException extends CryptoException {
  constructor() {
    super(
      CryptoErrorCode.INVALID_BLOB,
      'Invalid encrypted blob format',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidContextException extends CryptoException {
  constructor() {
    super(
      CryptoErrorCode.INVALID_CONTEXT,
      'Context mismatch: tenantId or recordId does not match',
      HttpStatus.BAD_REQUEST,
    );
  }
}
