/**
 * Interfaz para proveedores de email
 * Permite implementar múltiples proveedores (SMTP, SendGrid, etc.)
 */
export interface IEmailProvider {
  /**
   * Envía un email
   */
  sendEmail(options: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;

  /**
   * Verifica si el proveedor está configurado correctamente
   */
  isConfigured(): boolean;
}

export type EmailProviderType = 'SMTP' | 'SENDGRID' | 'MAILGUN' | 'NONE';
