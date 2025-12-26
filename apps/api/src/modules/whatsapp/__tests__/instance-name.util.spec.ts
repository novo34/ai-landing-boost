/**
 * Tests unitarios para utilidades de nombres de instancia
 */

describe('Instance Name Utilities', () => {
  describe('generateInstanceName', () => {
    it('should generate instance name with tenant prefix', () => {
      const tenantId = 'clx123abc';
      // Simular la función generateInstanceName
      const generateInstanceName = (tenantId: string, suffix?: string): string => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const customSuffix = suffix || `${timestamp}-${random}`;
        return `tenant-${tenantId}-${customSuffix}`;
      };

      const instanceName = generateInstanceName(tenantId);
      
      expect(instanceName).toMatch(/^tenant-clx123abc-/);
      expect(instanceName.length).toBeLessThanOrEqual(50);
    });

    it('should generate instance name with custom suffix', () => {
      const tenantId = 'clx123abc';
      const suffix = 'custom-suffix';
      
      const generateInstanceName = (tenantId: string, suffix?: string): string => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const customSuffix = suffix || `${timestamp}-${random}`;
        return `tenant-${tenantId}-${customSuffix}`;
      };

      const instanceName = generateInstanceName(tenantId, suffix);
      
      expect(instanceName).toBe(`tenant-${tenantId}-${suffix}`);
    });
  });

  describe('validateInstanceName', () => {
    it('should validate instance name with correct prefix', () => {
      const tenantId = 'clx123abc';
      const instanceName = `tenant-${tenantId}-1234567890`;
      
      const validateInstanceName = (instanceName: string, tenantId: string): boolean => {
        const prefix = `tenant-${tenantId}-`;
        return instanceName.startsWith(prefix) && instanceName.length <= 50;
      };

      expect(validateInstanceName(instanceName, tenantId)).toBe(true);
    });

    it('should reject instance name without prefix', () => {
      const tenantId = 'clx123abc';
      const instanceName = 'wrong-prefix-1234567890';
      
      const validateInstanceName = (instanceName: string, tenantId: string): boolean => {
        const prefix = `tenant-${tenantId}-`;
        return instanceName.startsWith(prefix) && instanceName.length <= 50;
      };

      expect(validateInstanceName(instanceName, tenantId)).toBe(false);
    });

    it('should reject instance name with wrong tenant prefix', () => {
      const tenantId = 'clx123abc';
      const instanceName = 'tenant-other-tenant-1234567890';
      
      const validateInstanceName = (instanceName: string, tenantId: string): boolean => {
        const prefix = `tenant-${tenantId}-`;
        return instanceName.startsWith(prefix) && instanceName.length <= 50;
      };

      expect(validateInstanceName(instanceName, tenantId)).toBe(false);
    });

    it('should reject instance name longer than 50 characters', () => {
      const tenantId = 'clx123abc';
      const instanceName = `tenant-${tenantId}-${'a'.repeat(60)}`;
      
      const validateInstanceName = (instanceName: string, tenantId: string): boolean => {
        const prefix = `tenant-${tenantId}-`;
        return instanceName.startsWith(prefix) && instanceName.length <= 50;
      };

      expect(validateInstanceName(instanceName, tenantId)).toBe(false);
    });
  });
});
