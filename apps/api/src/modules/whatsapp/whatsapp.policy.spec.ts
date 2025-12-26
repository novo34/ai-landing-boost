import { ForbiddenException } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import {
  assertAccountOwnedOrLegacyOverride,
  validateInstanceName,
} from './whatsapp.policy';

describe('WhatsAppPolicy', () => {
  const tenantA = 'tenant-a-123';
  const tenantB = 'tenant-b-456';

  describe('assertAccountOwnedOrLegacyOverride', () => {
    it('should allow same tenant (ownership by tenantId only)', () => {
      const account = {
        id: 'account-1',
        tenantId: tenantA,
        instanceName: 'PRUEBA1', // Invalid instanceName format
        credentials: '{"v":1,"alg":"aes-256-gcm"}',
        status: $Enums.tenantwhatsappaccount_status.CONNECTED,
      };

      expect(() => {
        assertAccountOwnedOrLegacyOverride({
          account,
          tenantId: tenantA,
          action: 'getInstanceStatus',
        });
      }).not.toThrow();
    });

    it('should deny different tenant (cross-tenant access)', () => {
      const account = {
        id: 'account-1',
        tenantId: tenantA,
        instanceName: 'PRUEBA1',
        credentials: '{"v":1,"alg":"aes-256-gcm"}',
        status: $Enums.tenantwhatsappaccount_status.CONNECTED,
      };

      expect(() => {
        assertAccountOwnedOrLegacyOverride({
          account,
          tenantId: tenantB,
          action: 'getInstanceStatus',
        });
      }).toThrow(ForbiddenException);
    });

    it('should allow same tenant even with invalid instanceName', () => {
      const account = {
        id: 'account-1',
        tenantId: tenantA,
        instanceName: 'Klever', // Invalid format, but same tenant
        credentials: '{"v":1,"alg":"aes-256-gcm"}',
        status: $Enums.tenantwhatsappaccount_status.CONNECTED,
      };

      expect(() => {
        assertAccountOwnedOrLegacyOverride({
          account,
          tenantId: tenantA,
          action: 'disconnectInstance',
        });
      }).not.toThrow();
    });
  });

  describe('validateInstanceName', () => {
    it('should validate instanceName with correct prefix', () => {
      const instanceName = `tenant-${tenantA}-abc123`;
      expect(validateInstanceName(instanceName, tenantA)).toBe(true);
    });

    it('should reject instanceName with wrong prefix', () => {
      const instanceName = `tenant-${tenantB}-abc123`;
      expect(validateInstanceName(instanceName, tenantA)).toBe(false);
    });

    it('should reject instanceName without prefix', () => {
      expect(validateInstanceName('PRUEBA1', tenantA)).toBe(false);
      expect(validateInstanceName('Klever', tenantA)).toBe(false);
    });
  });
});

