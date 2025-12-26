import { Injectable, Logger } from '@nestjs/common';
import { BaseWhatsAppProvider, AccountInfo } from './base.provider';
import axios, { AxiosInstance } from 'axios';
import { validateEvolutionBaseUrl } from '../../crypto/utils/url-validation.util';
import { EvolutionApiError } from './evolution-api.error';

/**
 * EvolutionProvider
 * 
 * Implementación del proveedor Evolution API para WhatsApp
 * Documentación: https://doc.evolution-api.com/
 * 
 * NOTA: Este provider opera por tenant connection (BYOE).
 * Todos los métodos reciben baseUrl + apiKey como parámetros.
 */
@Injectable()
export class EvolutionProvider extends BaseWhatsAppProvider {
  private readonly logger = new Logger(EvolutionProvider.name);

  /**
   * Testa conexión a Evolution API del tenant
   */
  async testConnection(
    baseUrl: string,
    apiKey: string,
  ): Promise<{
    success: boolean;
    statusReason?: string;
  }> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      // Intentar llamar a fetchInstances para validar credenciales
      await axios.get(`${normalizedUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      return { success: true };
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          statusReason: 'INVALID_CREDENTIALS',
        };
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          statusReason: 'NETWORK_ERROR',
        };
      }
      return {
        success: false,
        statusReason: 'TRANSIENT_ERROR',
      };
    }
  }

  /**
   * Crea una nueva instancia en Evolution API del tenant
   */
  async createInstance(
    baseUrl: string,
    apiKey: string,
    options: {
      instanceName: string; // DEBE incluir prefijo tenant-{tenantId}-
      phoneNumber?: string;
    },
  ): Promise<{
    instanceName: string;
    instanceId: string;
    status: 'open' | 'close' | 'connecting';
    qrCodeUrl: string | null;
  }> {
    try {
      // Validar baseUrl (SSRF protection - defensa en profundidad)
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      const { instanceName, phoneNumber } = options;
      
      this.logger.log(
        `createInstance: calling Evolution API - baseUrl=${normalizedUrl}, instanceName=${instanceName}, hasPhoneNumber=${!!phoneNumber}`
      );
      
      // Crear instancia en Evolution API
      // ESTA ES LA LLAMADA HTTP REAL QUE CREA LA INSTANCIA
      const response = await axios.post(
        `${normalizedUrl}/instance/create`,
        {
          instanceName,
          qrcode: true,
          integration: 'EVOLUTION',
          ...(phoneNumber && { number: phoneNumber }),
        },
        {
          headers: { apikey: apiKey },
          timeout: 15000,
        }
      );
      
      this.logger.log(
        `createInstance: Evolution API response - instanceName=${instanceName}, status=${response.data?.instance?.status || 'unknown'}, hasInstanceId=${!!response.data?.instance?.instanceId}`
      );
      
      // Obtener QR code
      let qrCodeUrl: string | null = null;
      try {
        const qrResponse = await axios.get(
          `${normalizedUrl}/instance/connect/${instanceName}`,
          {
            headers: { apikey: apiKey },
            timeout: 10000,
          }
        );
        
        // Manejar diferentes formatos de QR
        if (qrResponse.data?.qrcode?.base64) {
          qrCodeUrl = `data:image/png;base64,${qrResponse.data.qrcode.base64}`;
        } else if (qrResponse.data?.qrcode) {
          qrCodeUrl = qrResponse.data.qrcode;
        }
      } catch (qrError: any) {
        this.logger.warn(`Failed to get QR code for ${instanceName}: ${qrError.message}`);
        // No fallar si no se puede obtener QR, continuar
      }
      
      const result = {
        instanceName,
        instanceId: response.data?.instance?.instanceId || response.data?.hash || '',
        status: response.data?.instance?.status || 'connecting',
        qrCodeUrl,
      };
      
      this.logger.log(
        `createInstance: success - instanceName=${result.instanceName}, instanceId=${result.instanceId}, status=${result.status}, hasQR=${!!result.qrCodeUrl}`
      );
      
      return result;
    } catch (error: any) {
      this.logger.error(
        `createInstance: Evolution API call failed - baseUrl=${baseUrl}, instanceName=${options.instanceName}, error=${error.message}, statusCode=${error.response?.status}`,
        error.stack
      );
      throw EvolutionApiError.fromAxiosError(error);
    }
  }

  /**
   * Elimina una instancia de Evolution API del tenant
   */
  async deleteInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<void> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      await axios.delete(`${normalizedUrl}/instance/delete/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      this.logger.debug(`Instance ${instanceName} deleted successfully`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Instancia ya no existe, considerar éxito
        this.logger.warn(`Instance ${instanceName} not found (may already be deleted)`);
        return;
      }
      this.logger.error(`Failed to delete instance ${instanceName}: ${error.message}`);
      throw EvolutionApiError.fromAxiosError(error);
    }
  }

  /**
   * Conecta una instancia (obtiene nuevo QR code)
   */
  async connectInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{
    qrCodeUrl: string | null;
    status: 'open' | 'close' | 'connecting';
  }> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      const response = await axios.get(
        `${normalizedUrl}/instance/connect/${instanceName}`,
        {
          headers: { apikey: apiKey },
          timeout: 10000,
        }
      );
      
      let qrCodeUrl: string | null = null;
      if (response.data?.qrcode?.base64) {
        qrCodeUrl = `data:image/png;base64,${response.data.qrcode.base64}`;
      } else if (response.data?.qrcode) {
        qrCodeUrl = response.data.qrcode;
      }
      
      const status = response.data?.instance?.state || 'connecting';
      
      return {
        qrCodeUrl,
        status: status as 'open' | 'close' | 'connecting',
      };
    } catch (error: any) {
      this.logger.error(`Failed to connect instance ${instanceName}: ${error.message}`);
      throw EvolutionApiError.fromAxiosError(error);
    }
  }

  /**
   * Desconecta una instancia
   * Retorna información sobre si la conexión fue encontrada o no
   */
  async disconnectInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{
    disconnected: boolean;
    connectionNotFound: boolean;
  }> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      this.logger.debug(
        `disconnectInstance: baseUrl=${normalizedUrl}, instanceName=${instanceName}, endpoint=/instance/logout/${instanceName}`
      );
      
      await axios.delete(`${normalizedUrl}/instance/logout/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      this.logger.debug(`Instance ${instanceName} disconnected successfully`);
      return {
        disconnected: true,
        connectionNotFound: false,
      };
    } catch (error: any) {
      const statusCode = error.response?.status;
      const responseBody = error.response?.data;
      
      this.logger.debug(
        `disconnectInstance error: statusCode=${statusCode}, instanceName=${instanceName}, body=${JSON.stringify(responseBody)}`
      );
      
      if (statusCode === 404) {
        // Verificar si el mensaje indica "connection not found" o similar
        const errorMessage = responseBody?.message || error.message || '';
        const isConnectionNotFound = 
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('not found') ||
          errorMessage.toLowerCase().includes('instance') ||
          statusCode === 404;
        
        this.logger.warn(
          `Instance ${instanceName} not found in Evolution API (connection may already be disconnected). statusCode=${statusCode}, message=${errorMessage}`
        );
        
        return {
          disconnected: false,
          connectionNotFound: true,
        };
      }
      
      // Para otros errores (401, 403, 500, etc.), lanzar excepción
      this.logger.error(
        `Failed to disconnect instance ${instanceName}: statusCode=${statusCode}, message=${error.message}`
      );
      throw EvolutionApiError.fromAxiosError(error);
    }
  }

  /**
   * Obtiene estado detallado de una instancia
   */
  async getInstanceStatus(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{
    status: 'open' | 'close' | 'connecting';
    phoneNumber?: string;
    displayName?: string;
    lastSeen?: Date;
  }> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      // Obtener estado de conexión
      const stateResponse = await axios.get(
        `${normalizedUrl}/instance/connectionState/${instanceName}`,
        {
          headers: { apikey: apiKey },
          timeout: 10000,
        }
      );
      
      const status = stateResponse.data?.instance?.state || stateResponse.data?.state || 'close';
      
      // Obtener información de la instancia
      let phoneNumber: string | undefined;
      let displayName: string | undefined;
      
      try {
        const instancesResponse = await axios.get(
          `${normalizedUrl}/instance/fetchInstances`,
          {
            headers: { apikey: apiKey },
            timeout: 10000,
          }
        );
        
        const instance = instancesResponse.data.find(
          (i: any) => i.name === instanceName || i.instance?.instanceName === instanceName
        );
        
        if (instance) {
          if (instance.ownerJid) {
            phoneNumber = instance.ownerJid.split('@')[0];
          } else if (instance.instance?.jid) {
            phoneNumber = instance.instance.jid.split('@')[0];
          }
          
          displayName = instance.name || instance.instance?.instanceName;
        }
      } catch (infoError: any) {
        this.logger.warn(`Failed to get instance info: ${infoError.message}`);
      }
      
      return {
        status: status as 'open' | 'close' | 'connecting',
        phoneNumber: phoneNumber ? `+${phoneNumber}` : undefined,
        displayName,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          status: 'close',
        };
      }
      this.logger.error(`Failed to get instance status ${instanceName}: ${error.message}`);
      throw EvolutionApiError.fromAxiosError(error);
    }
  }

  /**
   * Lista todas las instancias en Evolution API del tenant
   * IMPORTANTE: Este método se llama UNA VEZ por tenant durante sync
   */
  async listAllInstances(
    baseUrl: string,
    apiKey: string,
  ): Promise<Array<{
    instanceName: string;
    status: 'open' | 'close' | 'connecting';
    phoneNumber?: string;
  }>> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      const response = await axios.get(`${normalizedUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      if (!Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((inst: any) => {
        const instanceName = inst.name || inst.instance?.instanceName;
        const status = inst.connectionStatus || inst.instance?.state || 'close';
        let phoneNumber: string | undefined;
        
        if (inst.ownerJid) {
          phoneNumber = `+${inst.ownerJid.split('@')[0]}`;
        } else if (inst.instance?.jid) {
          phoneNumber = `+${inst.instance.jid.split('@')[0]}`;
        }
        
        return {
          instanceName,
          status: status as 'open' | 'close' | 'connecting',
          phoneNumber,
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to list instances: ${error.message}`);
      throw EvolutionApiError.fromAxiosError(error);
    }
  }

  /**
   * Valida las credenciales de Evolution API
   * Verifica que la instancia esté conectada
   * (Método legacy mantenido para compatibilidad)
   */
  async validateCredentials(credentials: any): Promise<boolean> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      
      if (!apiKey || !instanceName || !baseUrl) {
        this.logger.warn(`Missing apiKey, instanceName, or baseUrl`);
        return false;
      }

      // Validar y normalizar baseUrl (protección SSRF)
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      this.logger.debug(`Validating credentials for instance: ${instanceName} at ${normalizedUrl}`);
      
      try {
        const response = await axios.get(
          `${normalizedUrl}/instance/connectionState/${instanceName}`,
          {
            headers: { apikey: apiKey },
            timeout: 10000,
          }
        );

        const state = response.data?.instance?.state || response.data?.state;
        const isValid = state === 'open';
        
        this.logger.debug(`Connection state for ${instanceName}: ${state}, isValid: ${isValid}`);
        
        return isValid;
      } catch (error: any) {
        if (error.response?.status === 404) {
          this.logger.warn(`Instance '${instanceName}' not found at ${normalizedUrl}`);
          return false;
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.logger.error(`Cannot connect to Evolution API at ${normalizedUrl}`);
          return false;
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          this.logger.warn('Invalid API Key');
          return false;
        }
        throw error;
      }
    } catch (error: any) {
      this.logger.error(`Evolution API validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene información de la cuenta de Evolution API
   * (Método legacy mantenido para compatibilidad)
   */
  async getAccountInfo(credentials: any): Promise<AccountInfo> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      
      if (!apiKey || !instanceName || !baseUrl) {
        throw new Error('Missing required credentials');
      }

      // Validar y normalizar baseUrl (protección SSRF)
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);

      let response;
      try {
        response = await axios.get(`${normalizedUrl}/instance/fetchInstances`, {
          headers: { apikey: apiKey },
          timeout: 10000,
        });
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new Error(`Cannot connect to Evolution API at ${normalizedUrl}. Please verify the Base URL is correct.`);
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Invalid API Key. Please verify your API Key is correct.');
        }
        throw new Error(`Failed to connect to Evolution API: ${error.message}`);
      }

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from Evolution API');
      }

      const instance = response.data.find(
        (i: any) => i.name === instanceName || i.instance?.instanceName === instanceName
      );

      if (!instance) {
        const availableInstances = response.data
          .map((i: any) => i.name || i.instance?.instanceName)
          .filter(Boolean);
        throw new Error(
          `Instance '${instanceName}' not found. Available instances: ${availableInstances.length > 0 ? availableInstances.join(', ') : 'none'}`
        );
      }

      let phoneNumber = '';
      let displayName = instanceName;
      let status: 'connected' | 'disconnected' = 'disconnected';

      if (instance.name) {
        displayName = instance.name;
        status = instance.connectionStatus === 'open' ? 'connected' : 'disconnected';
        
        if (instance.ownerJid) {
          phoneNumber = instance.ownerJid.split('@')[0] || '';
        } else if (instance.number) {
          phoneNumber = instance.number.toString();
        }
      } else if (instance.instance) {
        displayName = instance.instance.instanceName || instanceName;
        status = instance.instance.state === 'open' ? 'connected' : 'disconnected';
        
        if (instance.instance.jid) {
          phoneNumber = instance.instance.jid.split('@')[0] || '';
        }
      }

      return {
        phoneNumber: phoneNumber ? `+${phoneNumber}` : '',
        displayName: displayName,
        status: status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Evolution API account info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene el QR code para conectar la instancia (si es necesario)
   * (Método legacy mantenido para compatibilidad)
   */
  async getQRCode(credentials: any): Promise<string | null> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      
      if (!apiKey || !instanceName || !baseUrl) {
        return null;
      }

      // Validar y normalizar baseUrl (protección SSRF)
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);

      const response = await axios.get(`${normalizedUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });

      if (response.data?.qrcode?.base64) {
        return `data:image/png;base64,${response.data.qrcode.base64}`;
      }

      if (response.data?.qrcode) {
        return response.data.qrcode;
      }

      return null;
    } catch (error: any) {
      this.logger.warn(`Failed to get QR code from Evolution API: ${error.message}`);
      return null;
    }
  }

  /**
   * Envía un mensaje de texto a través de Evolution API
   * (Método legacy mantenido para compatibilidad)
   */
  async sendMessage(credentials: any, to: string, message: string): Promise<void> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      
      if (!apiKey || !instanceName || !baseUrl) {
        throw new Error('Missing required credentials');
      }

      // Validar y normalizar baseUrl (protección SSRF)
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);

      await axios.post(
        `${normalizedUrl}/message/sendText/${instanceName}`,
        {
          number: to,
          text: message,
        },
        {
          headers: { apikey: apiKey },
          timeout: 10000,
        }
      );
    } catch (error: any) {
      this.logger.error(`Failed to send message via Evolution API: ${error.message}`);
      throw EvolutionApiError.fromAxiosError(error);
    }
  }
}
