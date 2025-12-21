import { Injectable, Logger } from '@nestjs/common';
import { BaseWhatsAppProvider, AccountInfo } from './base.provider';
import axios from 'axios';

/**
 * WhatsAppCloudProvider
 * 
 * Implementación del proveedor WhatsApp Cloud API (Meta Direct) para WhatsApp
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
@Injectable()
export class WhatsAppCloudProvider extends BaseWhatsAppProvider {
  private readonly logger = new Logger(WhatsAppCloudProvider.name);
  private readonly API_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION || 'v21.0';
  private readonly BASE_URL = `https://graph.facebook.com/${this.API_VERSION}`;

  /**
   * Valida las credenciales de WhatsApp Cloud API
   * Verifica que el token y phoneNumberId sean válidos
   */
  async validateCredentials(credentials: any): Promise<boolean> {
    try {
      const { accessToken, phoneNumberId } = credentials;

      if (!accessToken || !phoneNumberId) {
        return false;
      }

      const response = await axios.get(`${this.BASE_URL}/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: 'id,display_phone_number' },
        timeout: 10000,
      });

      return !!response.data?.id;
    } catch (error: any) {
      this.logger.warn(`WhatsApp Cloud API validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene información de la cuenta de WhatsApp Cloud API
   */
  async getAccountInfo(credentials: any): Promise<AccountInfo> {
    try {
      const { accessToken, phoneNumberId } = credentials;

      const response = await axios.get(`${this.BASE_URL}/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          fields: 'id,display_phone_number,verified_name',
        },
        timeout: 10000,
      });

      return {
        phoneNumber: response.data?.display_phone_number || '',
        displayName: response.data?.verified_name || 'WhatsApp Business',
        status: 'connected',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get WhatsApp Cloud API account info: ${error.message}`);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * WhatsApp Cloud API no usa QR codes
   * La conexión se hace mediante tokens de acceso
   */
  async getQRCode(credentials: any): Promise<string | null> {
    // WhatsApp Cloud API no requiere QR codes
    return null;
  }

  /**
   * Envía un mensaje de texto a través de WhatsApp Cloud API
   */
  async sendMessage(credentials: any, to: string, message: string): Promise<void> {
    try {
      const { accessToken, phoneNumberId } = credentials;

      await axios.post(
        `${this.BASE_URL}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
    } catch (error: any) {
      this.logger.error(`Failed to send message via WhatsApp Cloud API: ${error.message}`);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}

