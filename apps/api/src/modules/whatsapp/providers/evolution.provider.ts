import { Injectable, Logger } from '@nestjs/common';
import { BaseWhatsAppProvider, AccountInfo } from './base.provider';
import axios, { AxiosInstance } from 'axios';

/**
 * EvolutionProvider
 * 
 * Implementación del proveedor Evolution API para WhatsApp
 * Documentación: https://doc.evolution-api.com/
 */
@Injectable()
export class EvolutionProvider extends BaseWhatsAppProvider {
  private readonly logger = new Logger(EvolutionProvider.name);
  private readonly defaultBaseUrl = process.env.EVOLUTION_API_DEFAULT_URL || 'https://api.evolution-api.com';

  /**
   * Valida las credenciales de Evolution API
   * Verifica que la instancia esté conectada
   */
  async validateCredentials(credentials: any): Promise<boolean> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      
      if (!apiKey || !instanceName) {
        this.logger.warn(`Missing apiKey or instanceName. apiKey: ${!!apiKey}, instanceName: ${!!instanceName}`);
        return false;
      }

      const url = baseUrl || this.defaultBaseUrl;
      
      // Normalizar URL (remover barra final si existe y espacios)
      const normalizedUrl = url.trim().replace(/\/$/, '');
      
      this.logger.debug(`Validating credentials for instance: ${instanceName} at ${normalizedUrl}`);
      
      try {
        const response = await axios.get(
          `${normalizedUrl}/instance/connectionState/${instanceName}`,
          {
            headers: { apikey: apiKey },
            timeout: 10000,
          }
        );

        // Evolution API devuelve: {"instance":{"instanceName":"...","state":"open"}}
        // o directamente: {"state":"open"}
        const state = response.data?.instance?.state || response.data?.state;
        const isValid = state === 'open';
        
        this.logger.debug(`Connection state for ${instanceName}: ${state}, isValid: ${isValid}, response data: ${JSON.stringify(response.data)}`);
        
        return isValid;
      } catch (error: any) {
        // Si el error es 404, puede ser que la instancia no exista
        if (error.response?.status === 404) {
          this.logger.warn(`Instance '${instanceName}' not found at ${normalizedUrl}`);
          return false;
        }
        // Si el error es de conexión, puede ser URL incorrecta
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.logger.error(`Cannot connect to Evolution API at ${normalizedUrl}. Check if the URL is correct.`);
          return false;
        }
        // Si el error es 401/403, la API Key es incorrecta
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
   */
  async getAccountInfo(credentials: any): Promise<AccountInfo> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      const url = baseUrl || this.defaultBaseUrl;
      
      // Normalizar URL (remover barra final si existe)
      const normalizedUrl = url.replace(/\/$/, '');

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

      // Verificar que la respuesta tenga datos
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from Evolution API');
      }

      // Evolution API puede devolver la estructura de dos formas:
      // 1. Array directo: [{ name: "...", connectionStatus: "...", ownerJid: "...", ... }]
      // 2. Array con wrapper: [{ instance: { instanceName: "...", state: "...", jid: "..." } }]
      const instance = response.data.find(
        (i: any) => i.name === instanceName || i.instance?.instanceName === instanceName
      );

      if (!instance) {
        // Listar instancias disponibles para ayudar al usuario
        const availableInstances = response.data
          .map((i: any) => i.name || i.instance?.instanceName)
          .filter(Boolean);
        throw new Error(
          `Instance '${instanceName}' not found. Available instances: ${availableInstances.length > 0 ? availableInstances.join(', ') : 'none'}`
        );
      }

      // Extraer información según la estructura de la respuesta
      let phoneNumber = '';
      let displayName = instanceName;
      let status: 'connected' | 'disconnected' = 'disconnected';

      // Estructura 1: respuesta directa (name, connectionStatus, ownerJid)
      if (instance.name) {
        displayName = instance.name;
        status = instance.connectionStatus === 'open' ? 'connected' : 'disconnected';
        
        // Obtener número de teléfono desde ownerJid o number
        if (instance.ownerJid) {
          phoneNumber = instance.ownerJid.split('@')[0] || '';
        } else if (instance.number) {
          phoneNumber = instance.number.toString();
        }
      } 
      // Estructura 2: respuesta con wrapper (instance.instanceName, instance.state, instance.jid)
      else if (instance.instance) {
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
      throw error; // Re-lanzar el error para que el servicio pueda manejarlo
    }
  }

  /**
   * Obtiene el QR code para conectar la instancia (si es necesario)
   */
  async getQRCode(credentials: any): Promise<string | null> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      const url = baseUrl || this.defaultBaseUrl;

      const response = await axios.get(`${url}/instance/connect/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });

      // Evolution API puede devolver el QR en diferentes formatos
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
   */
  async sendMessage(credentials: any, to: string, message: string): Promise<void> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      const url = baseUrl || this.defaultBaseUrl;

      await axios.post(
        `${url}/message/sendText/${instanceName}`,
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
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}

