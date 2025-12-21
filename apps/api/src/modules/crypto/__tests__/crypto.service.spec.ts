/**
 * Tests unitarios para CryptoService
 * 
 * Verifica:
 * 1. encrypt/decrypt OK
 * 2. Falla si cambia tenantId (AAD mismatch)
 * 3. Falla si cambia recordId (AAD mismatch)
 * 4. Falla si se altera ct/iv/tag
 * 5. Rotación: key v1 + v2
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from '../crypto.service';
import { CryptoModule } from '../crypto.module';
import { EncryptedBlobV1, CryptoContext } from '../crypto.types';
import { KeyMissingException, DecryptFailedException, InvalidBlobException } from '../crypto.errors';
import * as crypto from 'crypto';

describe('CryptoService', () => {
  let service: CryptoService;
  let originalEnv: NodeJS.ProcessEnv;

  // Generar claves de prueba (32 bytes en base64)
  const generateTestKey = (): string => {
    return crypto.randomBytes(32).toString('base64');
  };

  const KEY_V1 = generateTestKey();
  const KEY_V2 = generateTestKey();

  beforeAll(() => {
    // Guardar env original
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Configurar variables de entorno para tests
    process.env.ENCRYPTION_KEY_V1 = KEY_V1;
    process.env.ENCRYPTION_KEY_V2 = KEY_V2;
    process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '1';
  });

  afterEach(() => {
    // Restaurar env original
    process.env = { ...originalEnv };
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CryptoModule],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  describe('encryptJson / decryptJson', () => {
    const context: CryptoContext = {
      tenantId: 'tenant-123',
      recordId: 'record-456',
    };

    it('should encrypt and decrypt successfully', () => {
      const payload = { apiKey: 'test-api-key-123', secret: 'test-secret' };
      
      const encrypted = service.encryptJson(payload, context);
      const decrypted = service.decryptJson<typeof payload>(encrypted, context);

      expect(decrypted).toEqual(payload);
      expect(encrypted.v).toBe(1);
      expect(encrypted.alg).toBe('aes-256-gcm');
      expect(encrypted.keyVersion).toBe(1);
    });

    it('should fail if tenantId changes (AAD mismatch)', () => {
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);

      const wrongContext: CryptoContext = {
        tenantId: 'tenant-999', // Diferente
        recordId: context.recordId,
      };

      expect(() => {
        service.decryptJson(encrypted, wrongContext);
      }).toThrow(DecryptFailedException);
    });

    it('should fail if recordId changes (AAD mismatch)', () => {
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);

      const wrongContext: CryptoContext = {
        tenantId: context.tenantId,
        recordId: 'record-999', // Diferente
      };

      expect(() => {
        service.decryptJson(encrypted, wrongContext);
      }).toThrow(DecryptFailedException);
    });

    it('should fail if ciphertext is altered', () => {
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);

      // Alterar ciphertext
      const tampered: EncryptedBlobV1 = {
        ...encrypted,
        ctB64: encrypted.ctB64.slice(0, -5) + 'XXXXX', // Alterar
      };

      expect(() => {
        service.decryptJson(tampered, context);
      }).toThrow(DecryptFailedException);
    });

    it('should fail if IV is altered', () => {
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);

      // Alterar IV
      const tampered: EncryptedBlobV1 = {
        ...encrypted,
        ivB64: encrypted.ivB64.slice(0, -5) + 'XXXXX', // Alterar
      };

      expect(() => {
        service.decryptJson(tampered, context);
      }).toThrow(DecryptFailedException);
    });

    it('should fail if tag is altered', () => {
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);

      // Alterar tag
      const tampered: EncryptedBlobV1 = {
        ...encrypted,
        tagB64: encrypted.tagB64.slice(0, -5) + 'XXXXX', // Alterar
      };

      expect(() => {
        service.decryptJson(tampered, context);
      }).toThrow(DecryptFailedException);
    });

    it('should fail with invalid blob format', () => {
      const invalidBlob = {
        v: 2, // Versión incorrecta
        alg: 'aes-256-gcm',
        keyVersion: 1,
        ivB64: 'dGVzdA==',
        tagB64: 'dGVzdA==',
        ctB64: 'dGVzdA==',
      } as unknown as EncryptedBlobV1;

      expect(() => {
        service.decryptJson(invalidBlob, context);
      }).toThrow(InvalidBlobException);
    });
  });

  describe('Key rotation', () => {
    const context: CryptoContext = {
      tenantId: 'tenant-123',
      recordId: 'record-456',
    };

    it('should encrypt with key v1 and decrypt successfully', () => {
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '1';
      
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);
      
      expect(encrypted.keyVersion).toBe(1);
      
      const decrypted = service.decryptJson(encrypted, context);
      expect(decrypted).toEqual(payload);
    });

    it('should encrypt with key v2 when activeKeyVersion is 2', () => {
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '2';
      
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);
      
      expect(encrypted.keyVersion).toBe(2);
      
      const decrypted = service.decryptJson(encrypted, context);
      expect(decrypted).toEqual(payload);
    });

    it('should detect blob needs migration when keyVersion < activeKeyVersion', () => {
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '1';
      const payload = { apiKey: 'test-api-key' };
      const encrypted = service.encryptJson(payload, context);
      
      expect(encrypted.keyVersion).toBe(1);
      expect(service.needsMigration(encrypted)).toBe(false);

      // Cambiar activeKeyVersion a 2
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '2';
      expect(service.needsMigration(encrypted)).toBe(true);
    });

    it('should migrate blob from v1 to v2', () => {
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '1';
      const payload = { apiKey: 'test-api-key' };
      const encryptedV1 = service.encryptJson(payload, context);
      
      expect(encryptedV1.keyVersion).toBe(1);

      // Cambiar activeKeyVersion a 2
      process.env.ENCRYPTION_ACTIVE_KEY_VERSION = '2';
      
      const migrated = service.migrateBlob(encryptedV1, context);
      
      expect(migrated.keyVersion).toBe(2);
      
      // Verificar que se puede decrypt con v2
      const decrypted = service.decryptJson(migrated, context);
      expect(decrypted).toEqual(payload);
    });

    it('should fail if key version is missing', () => {
      delete process.env.ENCRYPTION_KEY_V1;
      
      const context: CryptoContext = {
        tenantId: 'tenant-123',
        recordId: 'record-456',
      };

      expect(() => {
        service.encryptJson({ apiKey: 'test' }, context);
      }).toThrow(KeyMissingException);
    });
  });

  describe('mask', () => {
    it('should mask text showing last 4 characters', () => {
      expect(service.mask('abcdefghijklmnop')).toBe('****-****-****-mnop');
    });

    it('should return **** for empty string', () => {
      expect(service.mask('')).toBe('****');
      expect(service.mask(null)).toBe('****');
      expect(service.mask(undefined)).toBe('****');
    });

    it('should return **** for text <= 4 characters', () => {
      expect(service.mask('abc')).toBe('****');
      expect(service.mask('abcd')).toBe('****');
    });
  });

  describe('hashForAudit', () => {
    it('should generate SHA-256 hash', () => {
      const hash = service.hashForAudit('test-password');
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('should return null for null/undefined', () => {
      expect(service.hashForAudit(null)).toBeNull();
      expect(service.hashForAudit(undefined)).toBeNull();
    });

    it('should generate same hash for same input', () => {
      const input = 'test-password';
      const hash1 = service.hashForAudit(input);
      const hash2 = service.hashForAudit(input);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const hash1 = service.hashForAudit('password1');
      const hash2 = service.hashForAudit('password2');
      
      expect(hash1).not.toBe(hash2);
    });
  });
});

