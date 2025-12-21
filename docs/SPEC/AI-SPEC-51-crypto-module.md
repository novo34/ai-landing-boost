# AI-SPEC-51: Módulo Central de Cifrado (CRYPTO-001)

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **PRD Relacionado:** PRD-51  
> **Prioridad:** 🔴 CRÍTICA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   └── crypto/
│       ├── crypto.module.ts                    [CREAR]
│       ├── crypto.service.ts                   [CREAR]
│       ├── crypto.helper.ts                    [CREAR]
│       ├── crypto.types.ts                     [CREAR]
│       ├── crypto.errors.ts                    [CREAR]
│       └── utils/
│           └── secure-logger.util.ts           [CREAR]
├── modules/
│   └── whatsapp/
│       ├── whatsapp.service.ts                 [MODIFICAR - usar crypto helper]
│       └── providers/
│           └── evolution.provider.ts           [MODIFICAR - usar credenciales descifradas]
└── modules/
    └── settings/
        └── settings.service.ts                 [MODIFICAR - usar crypto helper]
```

---

## Archivos a Crear/Modificar

### 1. Crear Tipos y Errores

**Archivo:** `apps/api/src/modules/crypto/crypto.types.ts`

```typescript
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
```

**Archivo:** `apps/api/src/modules/crypto/crypto.errors.ts`

```typescript
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
```

---

### 2. Crear Helper de Cifrado

**Archivo:** `apps/api/src/modules/crypto/crypto.helper.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import {
  EncryptedBlobV1,
  CryptoContext,
  EncryptOptions,
} from './crypto.types';
import {
  KeyMissingException,
  DecryptFailedException,
  InvalidBlobException,
  InvalidContextException,
} from './crypto.errors';

const scryptAsync = promisify(scrypt);

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
```

---

### 3. Crear Servicio de Cifrado

**Archivo:** `apps/api/src/modules/crypto/crypto.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
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
}
```

---

### 4. Crear Utilidad de Logging Seguro

**Archivo:** `apps/api/src/modules/crypto/utils/secure-logger.util.ts`

```typescript
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
```

---

### 5. Crear Módulo de Cifrado

**Archivo:** `apps/api/src/modules/crypto/crypto.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { CryptoService } from './crypto.service';

@Global() // Módulo global para uso en toda la aplicación
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
```

---

### 6. Modificar WhatsAppService para Usar Crypto

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`

**Agregar import y modificar métodos:**

```typescript
import { CryptoService } from '../crypto/crypto.service';
import { EncryptedBlobV1 } from '../crypto/crypto.types';

// En el constructor, inyectar CryptoService
constructor(
  // ... otros servicios
  private readonly cryptoService: CryptoService,
) {}

/**
 * Guarda credenciales Evolution cifradas
 */
async saveEvolutionCredentials(
  tenantId: string,
  connectionId: string,
  credentials: { baseUrl: string; apiKey: string },
) {
  // Cifrar credenciales
  const encryptedBlob = this.cryptoService.encryptJson(
    credentials,
    { tenantId, recordId: connectionId },
  );

  // Guardar en BD
  await this.prisma.tenantwhatsappaccount.update({
    where: { id: connectionId },
    data: {
      credentials: encryptedBlob as any, // Prisma JSON type
      status: 'OK',
      lastValidatedAt: new Date(),
    },
  });

  return {
    success: true,
    data: {
      id: connectionId,
      status: 'OK',
      baseUrl: credentials.baseUrl, // Sin apiKey
    },
  };
}

/**
 * Obtiene credenciales Evolution descifradas (solo para uso interno)
 */
private async getEvolutionCredentials(
  tenantId: string,
  connectionId: string,
): Promise<{ baseUrl: string; apiKey: string }> {
  const account = await this.prisma.tenantwhatsappaccount.findFirst({
    where: {
      id: connectionId,
      tenantId,
    },
  });

  if (!account || !account.credentials) {
    throw new NotFoundException('Connection not found');
  }

  const blob = account.credentials as unknown as EncryptedBlobV1;
  
  // Descifrar
  const credentials = this.cryptoService.decryptJson<{
    baseUrl: string;
    apiKey: string;
  }>(blob, { tenantId, recordId: connectionId });

  // Migración on-read si es necesario
  if (this.cryptoService.needsMigration(blob)) {
    const migratedBlob = this.cryptoService.migrateBlob(blob, {
      tenantId,
      recordId: connectionId,
    });
    
    await this.prisma.tenantwhatsappaccount.update({
      where: { id: connectionId },
      data: {
        credentials: migratedBlob as any,
      },
    });
  }

  return credentials;
}
```

---

### 7. Modificar EvolutionProvider para Usar Credenciales Descifradas

**Archivo:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`

**Modificar métodos para recibir credenciales descifradas:**

```typescript
/**
 * Realiza una llamada a Evolution API usando credenciales descifradas
 */
async callEvolutionAPI(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  credentials: { baseUrl: string; apiKey: string },
  data?: any,
): Promise<any> {
  const normalizedUrl = credentials.baseUrl.trim().replace(/\/$/, '');
  const url = `${normalizedUrl}${endpoint}`;

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        apikey: credentials.apiKey, // Usar apiKey descifrado
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error: any) {
    // Log seguro (sin exponer apiKey)
    this.logger.error(
      `Evolution API call failed: ${method} ${endpoint}`,
      {
        baseUrl: credentials.baseUrl, // Sin apiKey
        status: error.response?.status,
        message: error.message,
      },
    );
    throw error;
  }
}
```

---

### 8. Modificar WhatsAppModule para Incluir CryptoModule

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.module.ts`

```typescript
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [
    CryptoModule, // Importar módulo de cifrado
    // ... otros imports
  ],
  // ... resto del módulo
})
```

---

### 9. Modificar AppModule para Incluir CryptoModule Global

**Archivo:** `apps/api/src/app.module.ts`

```typescript
import { CryptoModule } from './modules/crypto/crypto.module';

@Module({
  imports: [
    CryptoModule, // Módulo global, disponible en toda la app
    // ... otros imports
  ],
  // ... resto del módulo
})
```

---

## Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Claves de cifrado (base64, 32 bytes al decodificar)
# Generar con: openssl rand -base64 32
ENCRYPTION_KEY_V1=<base64-encoded-32-bytes>
ENCRYPTION_KEY_V2=<base64-encoded-32-bytes>

# Versión activa de clave
ENCRYPTION_ACTIVE_KEY_VERSION=2

# Migración automática on-read
ENCRYPTION_MIGRATION_ON_READ=true
```

**Ejemplo de generación de claves:**

```bash
# Generar ENCRYPTION_KEY_V1
openssl rand -base64 32

# Generar ENCRYPTION_KEY_V2
openssl rand -base64 32
```

---

## Dependencias NPM

**Backend:**

No se requieren dependencias adicionales. Se usa el módulo `crypto` built-in de Node.js.

---

## Testing

### Tests Unitarios

**Archivo:** `apps/api/src/modules/crypto/crypto.helper.spec.ts`

```typescript
import { CryptoHelper } from './crypto.helper';
import { EncryptedBlobV1 } from './crypto.types';
import {
  DecryptFailedException,
  InvalidContextException,
  KeyMissingException,
} from './crypto.errors';

describe('CryptoHelper', () => {
  const context = {
    tenantId: 'tenant-123',
    recordId: 'record-456',
  };

  const payload = {
    baseUrl: 'https://evolution.example.com',
    apiKey: 'secret-api-key-123',
  };

  describe('encryptJson / decryptJson', () => {
    it('should encrypt and decrypt correctly', () => {
      const blob = CryptoHelper.encryptJson(payload, context);
      const decrypted = CryptoHelper.decryptJson<typeof payload>(blob, context);

      expect(decrypted).toEqual(payload);
    });

    it('should fail if tenantId changes', () => {
      const blob = CryptoHelper.encryptJson(payload, context);
      
      expect(() => {
        CryptoHelper.decryptJson<typeof payload>(blob, {
          tenantId: 'different-tenant',
          recordId: context.recordId,
        });
      }).toThrow(DecryptFailedException);
    });

    it('should fail if recordId changes', () => {
      const blob = CryptoHelper.encryptJson(payload, context);
      
      expect(() => {
        CryptoHelper.decryptJson<typeof payload>(blob, {
          tenantId: context.tenantId,
          recordId: 'different-record',
        });
      }).toThrow(DecryptFailedException);
    });

    it('should fail if blob is tampered', () => {
      const blob = CryptoHelper.encryptJson(payload, context);
      
      // Modificar ciphertext
      const tamperedBlob: EncryptedBlobV1 = {
        ...blob,
        ctB64: blob.ctB64.slice(0, -5) + 'XXXXX',
      };
      
      expect(() => {
        CryptoHelper.decryptJson<typeof payload>(tamperedBlob, context);
      }).toThrow(DecryptFailedException);
    });

    it('should fail if key version is missing', () => {
      // Simular clave faltante
      const originalEnv = process.env.ENCRYPTION_KEY_V1;
      delete process.env.ENCRYPTION_KEY_V1;
      
      expect(() => {
        CryptoHelper.encryptJson(payload, context, { keyVersion: 1 });
      }).toThrow(KeyMissingException);
      
      // Restaurar
      if (originalEnv) {
        process.env.ENCRYPTION_KEY_V1 = originalEnv;
      }
    });
  });

  describe('migration', () => {
    it('should detect if blob needs migration', () => {
      const blob = CryptoHelper.encryptJson(payload, context, { keyVersion: 1 });
      
      // Simular que la versión activa es 2
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '2';
      
      expect(CryptoHelper.needsMigration(blob)).toBe(true);
    });

    it('should migrate blob to active version', () => {
      const blobV1 = CryptoHelper.encryptJson(payload, context, { keyVersion: 1 });
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '2';
      
      const blobV2 = CryptoHelper.migrateBlob(blobV1, context);
      
      expect(blobV2.keyVersion).toBe(2);
      
      // Verificar que se puede descifrar con v2
      const decrypted = CryptoHelper.decryptJson<typeof payload>(blobV2, context);
      expect(decrypted).toEqual(payload);
    });
  });
});
```

**Archivo:** `apps/api/src/modules/crypto/utils/secure-logger.util.spec.ts`

```typescript
import { SecureLogger } from './secure-logger.util';
import { Logger } from '@nestjs/common';

describe('SecureLogger', () => {
  let secureLogger: SecureLogger;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    secureLogger = new SecureLogger();
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    } as any;
  });

  it('should redact apiKey in strings', () => {
    secureLogger.debug(mockLogger, 'apiKey: secret123');
    
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'apiKey: [REDACTED]',
      undefined,
    );
  });

  it('should redact secret fields in objects', () => {
    secureLogger.debug(mockLogger, 'Test message', {
      apiKey: 'secret123',
      baseUrl: 'https://example.com',
    });
    
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Test message',
      {
        apiKey: '[REDACTED]',
        baseUrl: 'https://example.com',
      },
    );
  });

  it('should not redact non-secret fields', () => {
    secureLogger.debug(mockLogger, 'Test message', {
      baseUrl: 'https://example.com',
      status: 'OK',
    });
    
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Test message',
      {
        baseUrl: 'https://example.com',
        status: 'OK',
      },
    );
  });
});
```

### Tests de Integración

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.spec.ts`

```typescript
describe('WhatsAppService - Crypto Integration', () => {
  it('should encrypt credentials when saving', async () => {
    // Test que las credenciales se cifran correctamente
  });

  it('should decrypt credentials when using', async () => {
    // Test que las credenciales se descifran correctamente
  });

  it('should not expose apiKey in responses', async () => {
    // Test que las respuestas no contienen apiKey
  });
});
```

---

## Consideraciones de Implementación

1. **Migración Gradual:**
   - Implementar el módulo crypto primero
   - Migrar módulos existentes uno por uno
   - Evolution BYOE como primer caso de uso

2. **Validación de Uso:**
   - ESLint rule para detectar uso directo de `crypto` module
   - Code review checklist: verificar uso de CryptoHelper

3. **Performance:**
   - Cifrado/descifrado < 5ms típico (verificar con benchmarks)
   - No cachear secretos descifrados en memoria

4. **Seguridad:**
   - Rotar claves periódicamente (cada 6-12 meses)
   - Mantener backup seguro de claves antiguas
   - Auditar todos los eventos de cifrado/descifrado

5. **Manejo de Errores:**
   - Errores de decrypt no deben crashear el request
   - Marcar status=INVALID y sugerir re-conectar

6. **Testing:**
   - Tests unitarios para todos los casos edge
   - Tests de snapshot para verificar logging seguro
   - Tests de performance para verificar < 5ms

---

## Referencias

- PRD-51: Módulo Central de Cifrado del SaaS (CRYPTO-001)
- Node.js Crypto Documentation: https://nodejs.org/api/crypto.html
- AES-GCM Specification: NIST SP 800-38D
- Evolution API Documentation: https://docs.evoapicloud.com/

---

**Última actualización:** 2025-01-27
