/**
 * Tests unitarios para validateEvolutionBaseUrl
 * 
 * Verifica protección SSRF:
 * 1. Permite https válido
 * 2. Bloquea http (si config lo exige)
 * 3. Bloquea localhost / 127.0.0.1
 * 4. Bloquea 10/8, 172.16/12, 192.168/16
 * 5. Bloquea 169.254/16
 * 6. Bloquea file:, ftp:, javascript:
 */

import { BadRequestException } from '@nestjs/common';
import { validateEvolutionBaseUrl } from '../utils/url-validation.util';

describe('validateEvolutionBaseUrl', () => {
  describe('URLs válidas', () => {
    it('should accept valid HTTPS URL', () => {
      const url = 'https://api.evolution-api.com';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com');
    });

    it('should accept HTTPS URL with path', () => {
      const url = 'https://api.evolution-api.com/v1';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com/v1');
    });

    it('should accept HTTPS URL with port', () => {
      const url = 'https://api.evolution-api.com:8080';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com:8080');
    });

    it('should normalize URL by removing trailing slash', () => {
      const url = 'https://api.evolution-api.com/';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com');
    });

    it('should add https:// if protocol is missing', () => {
      const url = 'api.evolution-api.com';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com');
    });

    it('should trim whitespace', () => {
      const url = '  https://api.evolution-api.com  ';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com');
    });

    it('should accept HTTP if allowHttp=true', () => {
      const url = 'http://api.evolution-api.com';
      expect(validateEvolutionBaseUrl(url, true)).toBe('http://api.evolution-api.com');
    });
  });

  describe('Bloqueo de protocolos peligrosos', () => {
    it('should block file:// protocol', () => {
      expect(() => {
        validateEvolutionBaseUrl('file:///etc/passwd');
      }).toThrow(BadRequestException);
    });

    it('should block ftp:// protocol', () => {
      expect(() => {
        validateEvolutionBaseUrl('ftp://example.com');
      }).toThrow(BadRequestException);
    });

    it('should block javascript: protocol', () => {
      expect(() => {
        validateEvolutionBaseUrl('javascript:alert(1)');
      }).toThrow(BadRequestException);
    });

    it('should block data: protocol', () => {
      expect(() => {
        validateEvolutionBaseUrl('data:text/html,<script>alert(1)</script>');
      }).toThrow(BadRequestException);
    });

    it('should block vbscript: protocol', () => {
      expect(() => {
        validateEvolutionBaseUrl('vbscript:msgbox(1)');
      }).toThrow(BadRequestException);
    });
  });

  describe('Bloqueo de localhost', () => {
    it('should block localhost', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://localhost:8080');
      }).toThrow(BadRequestException);
    });

    it('should block 127.0.0.1', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://127.0.0.1:8080');
      }).toThrow(BadRequestException);
    });

    it('should block 0.0.0.0', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://0.0.0.0:8080');
      }).toThrow(BadRequestException);
    });

    it('should block ::1 (IPv6 localhost)', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://[::1]:8080');
      }).toThrow(BadRequestException);
    });
  });

  describe('Bloqueo de IPs privadas', () => {
    it('should block 10.0.0.0/8 (10.x.x.x)', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://10.0.0.1:8080');
      }).toThrow(BadRequestException);

      expect(() => {
        validateEvolutionBaseUrl('https://10.255.255.255:8080');
      }).toThrow(BadRequestException);
    });

    it('should block 172.16.0.0/12 (172.16.x.x - 172.31.x.x)', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://172.16.0.1:8080');
      }).toThrow(BadRequestException);

      expect(() => {
        validateEvolutionBaseUrl('https://172.31.255.255:8080');
      }).toThrow(BadRequestException);

      // 172.15.x.x debería pasar (fuera del rango)
      expect(() => {
        validateEvolutionBaseUrl('https://172.15.0.1:8080');
      }).not.toThrow();
    });

    it('should block 192.168.0.0/16 (192.168.x.x)', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://192.168.0.1:8080');
      }).toThrow(BadRequestException);

      expect(() => {
        validateEvolutionBaseUrl('https://192.168.255.255:8080');
      }).toThrow(BadRequestException);
    });
  });

  describe('Bloqueo de link-local', () => {
    it('should block 169.254.0.0/16 (169.254.x.x)', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://169.254.0.1:8080');
      }).toThrow(BadRequestException);

      expect(() => {
        validateEvolutionBaseUrl('https://169.254.255.255:8080');
      }).toThrow(BadRequestException);
    });
  });

  describe('Bloqueo de multicast', () => {
    it('should block 224.0.0.0/4 (224.x.x.x - 239.x.x.x)', () => {
      expect(() => {
        validateEvolutionBaseUrl('https://224.0.0.1:8080');
      }).toThrow(BadRequestException);

      expect(() => {
        validateEvolutionBaseUrl('https://239.255.255.255:8080');
      }).toThrow(BadRequestException);
    });
  });

  describe('Validación de HTTP', () => {
    it('should block HTTP by default', () => {
      expect(() => {
        validateEvolutionBaseUrl('http://api.evolution-api.com');
      }).toThrow(BadRequestException);
    });

    it('should allow HTTP if allowHttp=true', () => {
      expect(() => {
        validateEvolutionBaseUrl('http://api.evolution-api.com', true);
      }).not.toThrow();
    });
  });

  describe('Validación de entrada', () => {
    it('should throw if URL is null', () => {
      expect(() => {
        validateEvolutionBaseUrl(null as any);
      }).toThrow(BadRequestException);
    });

    it('should throw if URL is undefined', () => {
      expect(() => {
        validateEvolutionBaseUrl(undefined as any);
      }).toThrow(BadRequestException);
    });

    it('should throw if URL is empty string', () => {
      expect(() => {
        validateEvolutionBaseUrl('');
      }).toThrow(BadRequestException);
    });

    it('should throw if URL is only whitespace', () => {
      expect(() => {
        validateEvolutionBaseUrl('   ');
      }).toThrow(BadRequestException);
    });

    it('should throw if URL format is invalid', () => {
      expect(() => {
        validateEvolutionBaseUrl('not-a-valid-url');
      }).toThrow(BadRequestException);
    });
  });

  describe('Casos edge', () => {
    it('should handle URL with query parameters', () => {
      const url = 'https://api.evolution-api.com?param=value';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com?param=value');
    });

    it('should handle URL with fragment', () => {
      const url = 'https://api.evolution-api.com#fragment';
      expect(validateEvolutionBaseUrl(url)).toBe('https://api.evolution-api.com#fragment');
    });

    it('should handle subdomain', () => {
      const url = 'https://subdomain.example.com';
      expect(validateEvolutionBaseUrl(url)).toBe('https://subdomain.example.com');
    });

    it('should handle IP pública válida', () => {
      const url = 'https://8.8.8.8'; // Google DNS
      expect(validateEvolutionBaseUrl(url)).toBe('https://8.8.8.8');
    });
  });
});

