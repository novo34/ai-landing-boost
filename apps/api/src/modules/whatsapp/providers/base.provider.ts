/**
 * Base Provider Interface y Clase Abstracta
 * 
 * Define el contrato que deben cumplir todos los proveedores de WhatsApp
 */
export interface AccountInfo {
  phoneNumber: string;
  displayName: string;
  status: 'connected' | 'disconnected';
}

export interface WhatsAppProviderInterface {
  validateCredentials(credentials: any): Promise<boolean>;
  getAccountInfo(credentials: any): Promise<AccountInfo>;
  sendMessage(credentials: any, to: string, message: string): Promise<void>;
  getQRCode(credentials: any): Promise<string | null>;
}

export abstract class BaseWhatsAppProvider implements WhatsAppProviderInterface {
  abstract validateCredentials(credentials: any): Promise<boolean>;
  abstract getAccountInfo(credentials: any): Promise<AccountInfo>;
  abstract sendMessage(credentials: any, to: string, message: string): Promise<void>;
  abstract getQRCode(credentials: any): Promise<string | null>;
}

