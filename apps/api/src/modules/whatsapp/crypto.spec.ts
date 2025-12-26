/**
 * Test básico de crypto: encrypt -> persist -> read -> decrypt = OK
 * 
 * Este test verifica que:
 * 1. encryptCredentials usa tenantId y recordId correctos
 * 2. decryptCredentials usa los MISMOS tenantId y recordId
 * 3. El resultado es idéntico al original
 * 
 * NOTA: Este es un test de integración que requiere CryptoService real.
 * Para ejecutar: jest crypto.spec.ts
 */

import { CryptoService } from '../crypto/crypto.service';
import { EncryptedBlobV1 } from '../crypto/crypto.types';

describe('WhatsApp Crypto Integration', () => {
  let cryptoService: CryptoService;
  const tenantId = 'test-tenant-123';
  const recordId = 'test-account-456';

  beforeAll(() => {
    // Inicializar CryptoService (requiere ENCRYPTION_KEY_V1 en env)
    cryptoService = new CryptoService();
  });

  it('should encrypt and decrypt with same tenantId/recordId', () => {
    const originalCredentials = {
      baseUrl: 'https://api.evolution-api.com',
      apiKey: 'test-api-key',
      instanceName: 'test-instance',
    };

    // Encrypt
    const encrypted: EncryptedBlobV1 = cryptoService.encryptJson(originalCredentials, {
      tenantId,
      recordId,
    });

    expect(encrypted).toBeDefined();
    expect(encrypted.v).toBe(1);
    expect(encrypted.alg).toBe('aes-256-gcm');

    // Simular persistencia (stringify)
    const persisted = JSON.stringify(encrypted);

    // Simular lectura (parse)
    const read: EncryptedBlobV1 = JSON.parse(persisted);

    // Decrypt con MISMOS tenantId y recordId
    const decrypted = cryptoService.decryptJson<typeof originalCredentials>(read, {
      tenantId,
      recordId,
    });

    expect(decrypted).toEqual(originalCredentials);
  });

  it('should fail decrypt with wrong tenantId', () => {
    const originalCredentials = {
      baseUrl: 'https://api.evolution-api.com',
      apiKey: 'test-api-key',
    };

    const encrypted = cryptoService.encryptJson(originalCredentials, {
      tenantId,
      recordId,
    });

    // Intentar decrypt con tenantId diferente
    expect(() => {
      cryptoService.decryptJson(encrypted, {
        tenantId: 'wrong-tenant',
        recordId,
      });
    }).toThrow();
  });

  it('should fail decrypt with wrong recordId', () => {
    const originalCredentials = {
      baseUrl: 'https://api.evolution-api.com',
      apiKey: 'test-api-key',
    };

    const encrypted = cryptoService.encryptJson(originalCredentials, {
      tenantId,
      recordId,
    });

    // Intentar decrypt con recordId diferente
    expect(() => {
      cryptoService.decryptJson(encrypted, {
        tenantId,
        recordId: 'wrong-record',
      });
    }).toThrow();
  });
});

