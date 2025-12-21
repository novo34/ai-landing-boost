import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { EncryptedBlobV1 } from '../crypto/crypto.types';
import { validateEvolutionBaseUrl } from '../crypto/utils/url-validation.util';
import { EvolutionProvider } from './providers/evolution.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { $Enums } from '@prisma/client';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private evolutionProvider: EvolutionProvider,
    private whatsappCloudProvider: WhatsAppCloudProvider,
  ) {}

  /**
   * Helper para detectar si las credenciales están en formato legacy (string)
   * 
   * NOTA: El formato legacy ya no está soportado.
   * Todos los datos deben estar migrados a EncryptedBlobV1.
   */
  private isLegacyFormat(credentials: any): boolean {
    if (!credentials || typeof credentials !== 'string') {
      return false;
    }
    // Verificar si es un objeto JSON (EncryptedBlobV1) parseado como string
    try {
      const parsed = JSON.parse(credentials);
      if (parsed && typeof parsed === 'object' && parsed.v === 1 && parsed.alg === 'aes-256-gcm') {
        return false; // Es formato nuevo
      }
    } catch {
      // No es JSON válido
    }
    return true; // Es formato legacy (string con formato iv:tag:encrypted)
  }

  /**
   * Helper para descifrar credenciales (solo formato nuevo EncryptedBlobV1)
   * 
   * NOTA: El formato legacy ya no está soportado.
   * Todos los datos deben estar migrados a EncryptedBlobV1 usando el script de migración.
   */
  private async decryptCredentials(
    credentials: any,
    tenantId: string,
    recordId: string,
  ): Promise<{ decrypted?: any; migratedBlob?: EncryptedBlobV1 } | any> {
    // Validar que es formato nuevo (EncryptedBlobV1)
    if (this.isLegacyFormat(credentials)) {
      throw new Error(
        `Legacy format detected for record ${recordId}. Please run the migration script: npm run migrate-crypto-legacy`
      );
    }

    // Usar CryptoService (formato nuevo)
    try {
      const blob = credentials as EncryptedBlobV1;
      const decrypted = this.cryptoService.decryptJson<any>(blob, {
        tenantId,
        recordId,
      });

      // Migración on-read si es necesario
      if (this.cryptoService.needsMigration(blob)) {
        const migratedBlob = this.cryptoService.migrateBlob(blob, {
          tenantId,
          recordId,
        });
        // Actualizar en BD (esto se hace en el método que llama)
        return { decrypted, migratedBlob };
      }

      return decrypted;
    } catch (error) {
      this.logger.warn(`Failed to decrypt credentials for record ${recordId}`);
      throw error;
    }
  }

  /**
   * Helper para cifrar credenciales (siempre usa el nuevo formato)
   */
  private encryptCredentials(
    credentials: any,
    tenantId: string,
    recordId: string,
  ): EncryptedBlobV1 {
    return this.cryptoService.encryptJson(credentials, { tenantId, recordId });
  }

  /**
   * Helper para obtener credenciales enmascaradas
   */
  private getMaskedCredentials(creds: any, provider: $Enums.tenantwhatsappaccount_provider): string {
    if (provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      return this.cryptoService.mask(creds.apiKey || '');
    } else if (provider === $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD) {
      return this.cryptoService.mask(creds.accessToken || '');
    }
    return '****';
  }

  /**
   * Obtiene todas las cuentas de WhatsApp del tenant
   * CRÍTICO: El tenantId debe venir del TenantContextGuard (validado)
   */
  async getAccounts(tenantId: string) {
    // Validación adicional de seguridad: asegurar que el tenantId es válido
    // (aunque TenantContextGuard ya lo validó, esta es una capa extra de seguridad)
    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException({
        success: false,
        error_key: 'tenants.invalid_tenant_id',
      });
    }
    
    const accounts = await this.prisma.tenantwhatsappaccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Procesar cuentas y manejar migraciones
    const processedAccounts = await Promise.all(
      accounts.map(async (acc) => {
        // Obtener credenciales enmascaradas
        let maskedCredentials = '****';
        
        // No intentar descifrar si el status es DISCONNECTED (requiere reconexión)
        if (acc.status !== $Enums.tenantwhatsappaccount_status.DISCONNECTED) {
          try {
            const result = await this.decryptCredentials(acc.credentials, tenantId, acc.id);
            const creds = result.decrypted || result;
            maskedCredentials = this.getMaskedCredentials(creds, acc.provider);
            
            // Si hay migración pendiente, actualizar en BD (sin bloquear request)
            if (result.migratedBlob) {
              this.prisma.tenantwhatsappaccount.update({
                where: { id: acc.id },
                data: { credentials: result.migratedBlob as any },
              }).catch(err => {
                // No romper el request si falla la migración, solo loguear
                this.logger.warn(`Failed to migrate credentials for account ${acc.id}: ${err.message}`);
              });
            }
          } catch (error) {
            this.logger.warn(`Failed to decrypt credentials for account ${acc.id}`);
          }
        }

        return {
          id: acc.id,
          provider: acc.provider,
          phoneNumber: acc.phoneNumber,
          status: acc.status,
          displayName: acc.displayName,
          instanceName: acc.instanceName,
          connectedAt: acc.connectedAt,
          lastCheckedAt: acc.lastCheckedAt,
          createdAt: acc.createdAt,
          updatedAt: acc.updatedAt,
          credentials: {
            masked: maskedCredentials,
          },
        };
      })
    );

    return {
      success: true,
      data: processedAccounts,
    };
  }

  /**
   * Obtiene una cuenta específica por ID
   */
  async getAccountById(tenantId: string, accountId: string) {
        const account = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }

    // Obtener credenciales enmascaradas
    let maskedCredentials = '****';
    try {
      const result = await this.decryptCredentials(account.credentials, tenantId, account.id);
      const creds = result.decrypted || result;
      maskedCredentials = this.getMaskedCredentials(creds, account.provider);
      
      // Si hay migración pendiente, actualizar en BD
      if (result.migratedBlob) {
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: account.id },
          data: { credentials: result.migratedBlob as any },
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to decrypt credentials for account ${account.id}`);
    }

    return {
      success: true,
      data: {
        id: account.id,
        provider: account.provider,
        phoneNumber: account.phoneNumber,
        status: account.status,
        displayName: account.displayName,
        instanceName: account.instanceName,
        qrCodeUrl: account.qrCodeUrl,
        connectedAt: account.connectedAt,
        lastCheckedAt: account.lastCheckedAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        credentials: {
          masked: maskedCredentials,
        },
      },
    };
  }

  /**
   * Crea una nueva cuenta de WhatsApp
   */
  async createAccount(tenantId: string, dto: CreateAccountDto) {
    // Validar baseUrl si es Evolution API (protección SSRF)
    if (dto.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API && dto.credentials.baseUrl) {
      try {
        dto.credentials.baseUrl = validateEvolutionBaseUrl(dto.credentials.baseUrl, false);
      } catch (error: any) {
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.invalid_base_url',
          message: error.message || 'Base URL inválida o no permitida',
        });
      }
    }

    // Validar credenciales contra el proveedor
    this.logger.debug(`Validating credentials for provider: ${dto.provider}`);
    const isValid = await this.validateCredentials(dto.provider, dto.credentials);
    this.logger.debug(`Validation result: ${isValid}`);
    
    if (!isValid) {
      this.logger.warn(`Credential validation failed for provider ${dto.provider}`);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.invalid_credentials',
        message: 'Las credenciales no son válidas. Verifica la API Key, Base URL e Instance Name.',
      });
    }

    // Obtener información de la cuenta del proveedor
    let accountInfo;
    try {
      accountInfo = await this.getAccountInfo(dto.provider, dto.credentials);
    } catch (error: any) {
      this.logger.error(`Failed to get account info: ${error.message}`);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.account_info_failed',
        message: error.message || 'No se pudo obtener la información de la cuenta. Verifica que la instancia exista y esté configurada correctamente.',
      });
    }

    // Cifrar credenciales usando el nuevo formato
    // Nota: accountId aún no existe, usamos un ID temporal que se actualizará después
    const tempRecordId = `temp-${Date.now()}`;
    const encryptedCredentials = this.encryptCredentials(dto.credentials, tenantId, tempRecordId);

    // Verificar si ya existe una cuenta con el mismo número
        const existingAccount = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        tenantId,
        phoneNumber: accountInfo.phoneNumber,
      },
    });

    if (existingAccount) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.account_already_exists',
        error_params: { phoneNumber: accountInfo.phoneNumber },
      });
    }

    // Obtener QR code si es necesario (Evolution API)
    let qrCodeUrl: string | null = null;
    if (dto.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      qrCodeUrl = await this.getProviderQRCode(dto.provider, dto.credentials);
    }

    // Crear cuenta
    const account = await this.prisma.tenantwhatsappaccount.create({
      data: createData({
        tenantId,
        provider: dto.provider,
        phoneNumber: accountInfo.phoneNumber,
        status: accountInfo.status === 'connected' ? $Enums.tenantwhatsappaccount_status.CONNECTED : $Enums.tenantwhatsappaccount_status.PENDING,
        credentials: encryptedCredentials as any, // Prisma JSON type
        displayName: accountInfo.displayName,
        instanceName: dto.credentials.instanceName || null,
        qrCodeUrl,
        connectedAt: accountInfo.status === 'connected' ? new Date() : null,
        lastCheckedAt: new Date(),
      }),
    });

    // Re-cifrar con el recordId real (para context binding correcto)
    const finalEncryptedCredentials = this.encryptCredentials(dto.credentials, tenantId, account.id);
    await this.prisma.tenantwhatsappaccount.update({
      where: { id: account.id },
      data: { credentials: finalEncryptedCredentials as any },
    });

    return {
      success: true,
      data: {
        id: account.id,
        provider: account.provider,
        phoneNumber: account.phoneNumber,
        status: account.status,
        displayName: account.displayName,
        qrCodeUrl: account.qrCodeUrl,
        connectedAt: account.connectedAt,
      },
    };
  }

  /**
   * Actualiza una cuenta de WhatsApp
   */
  async updateAccount(tenantId: string, accountId: string, dto: UpdateAccountDto) {
        const account = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }

    const updateData: any = {};

    // Si se actualizan credenciales, validarlas y encriptarlas
    if (dto.credentials) {
      // Validar baseUrl si es Evolution API (protección SSRF)
      if (account.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API && dto.credentials.baseUrl) {
        try {
          dto.credentials.baseUrl = validateEvolutionBaseUrl(dto.credentials.baseUrl, false);
        } catch (error: any) {
          throw new BadRequestException({
            success: false,
            error_key: 'whatsapp.invalid_base_url',
            message: error.message || 'Base URL inválida o no permitida',
          });
        }
      }

      const isValid = await this.validateCredentials(account.provider, dto.credentials);
      if (!isValid) {
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.invalid_credentials',
        });
      }

      const accountInfo = await this.getAccountInfo(account.provider, dto.credentials);
      updateData.credentials = this.encryptCredentials(dto.credentials, tenantId, accountId);
      updateData.displayName = accountInfo.displayName;
      updateData.status = accountInfo.status === 'connected' ? $Enums.tenantwhatsappaccount_status.CONNECTED : $Enums.tenantwhatsappaccount_status.PENDING;
      updateData.connectedAt = accountInfo.status === 'connected' ? new Date() : account.connectedAt;
      updateData.lastCheckedAt = new Date();
    }

    if (dto.displayName) {
      updateData.displayName = dto.displayName;
    }

    if (dto.instanceName) {
      updateData.instanceName = dto.instanceName;
    }

        const updatedAccount = await this.prisma.tenantwhatsappaccount.update({
      where: { id: accountId },
      data: updateData,
    });

    return {
      success: true,
      data: {
        id: updatedAccount.id,
        provider: updatedAccount.provider,
        phoneNumber: updatedAccount.phoneNumber,
        status: updatedAccount.status,
        displayName: updatedAccount.displayName,
        updatedAt: updatedAccount.updatedAt,
      },
    };
  }

  /**
   * Elimina una cuenta de WhatsApp
   */
  async deleteAccount(tenantId: string, accountId: string) {
    try {
      const account = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          id: accountId,
          tenantId,
        },
      });

      if (!account) {
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.account_not_found',
        });
      }

      await this.prisma.tenantwhatsappaccount.delete({
        where: { id: accountId },
      });

      return {
        success: true,
        data: { id: accountId },
      };
    } catch (error) {
      // Si ya es una excepción HTTP, relanzarla
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Para otros errores, loguear y lanzar una excepción genérica
      this.logger.error(`Unexpected error deleting account ${accountId}: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.delete_error',
        message: 'Error inesperado al eliminar la cuenta.',
      });
    }
  }

  /**
   * Valida la conexión de una cuenta
   */
  async validateAccount(tenantId: string, accountId: string) {
    try {
      const account = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          id: accountId,
          tenantId,
        },
      });

      if (!account) {
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.account_not_found',
        });
      }

      // Descifrar credenciales
      let credentials: any;
      let migratedBlob: EncryptedBlobV1 | null = null;
      try {
        const result = await this.decryptCredentials(account.credentials, tenantId, accountId);
        if (result && typeof result === 'object' && 'decrypted' in result) {
          credentials = result.decrypted;
          migratedBlob = result.migratedBlob || null;
        } else {
          credentials = result;
        }
      } catch (error: any) {
        this.logger.error(`Failed to decrypt credentials for account ${accountId}: ${error.message}`);
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.invalid_credentials_format',
          message: 'No se pudieron desencriptar las credenciales de la cuenta.',
        });
      }

      // Validar credenciales
      let isValid: boolean;
      try {
        isValid = await this.validateCredentials(account.provider, credentials);
      } catch (error) {
        this.logger.error(`Failed to validate credentials for account ${accountId}: ${error.message}`);
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: accountId },
          data: {
            status: $Enums.tenantwhatsappaccount_status.ERROR,
            lastCheckedAt: new Date(),
          },
        });
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.validation_error',
          message: 'Error al validar las credenciales con el proveedor.',
        });
      }

      if (isValid) {
        // Obtener información actualizada
        let accountInfo;
        try {
          accountInfo = await this.getAccountInfo(account.provider, credentials);
        } catch (error) {
          this.logger.error(`Failed to get account info for account ${accountId}: ${error.message}`);
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: accountId },
            data: {
              status: $Enums.tenantwhatsappaccount_status.ERROR,
              lastCheckedAt: new Date(),
            },
          });
          throw new BadRequestException({
            success: false,
            error_key: 'whatsapp.account_info_error',
            message: 'Error al obtener información de la cuenta del proveedor.',
          });
        }

        const updateData: any = {
          status: $Enums.tenantwhatsappaccount_status.CONNECTED,
          displayName: accountInfo.displayName,
          lastCheckedAt: new Date(),
          connectedAt: account.connectedAt || new Date(),
        };
        
        // Si hay migración pendiente, incluir el blob migrado
        if (migratedBlob) {
          updateData.credentials = migratedBlob as any;
        }
        
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: accountId },
          data: updateData,
        });

        return {
          success: true,
          data: {
            status: $Enums.tenantwhatsappaccount_status.CONNECTED,
            phoneNumber: account.phoneNumber,
            displayName: accountInfo.displayName,
            validatedAt: new Date(),
          },
        };
      } else {
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: accountId },
          data: {
            status: $Enums.tenantwhatsappaccount_status.ERROR,
            lastCheckedAt: new Date(),
          },
        });

        return {
          success: false,
          error_key: 'whatsapp.validation_failed',
          data: {
            status: $Enums.tenantwhatsappaccount_status.ERROR,
          },
        };
      }
    } catch (error) {
      // Si ya es una excepción HTTP, relanzarla
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Para otros errores, loguear y lanzar una excepción genérica
      this.logger.error(`Unexpected error validating account ${accountId}: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.validation_error',
        message: 'Error inesperado al validar la cuenta.',
      });
    }
  }

  /**
   * Reconecta una cuenta (obtiene nuevo QR si es necesario)
   */
  async reconnectAccount(tenantId: string, accountId: string) {
    try {
      const account = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          id: accountId,
          tenantId,
        },
      });

      if (!account) {
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.account_not_found',
        });
      }

      // Descifrar credenciales
      let credentials: any;
      let migratedBlob: EncryptedBlobV1 | null = null;
      try {
        const result = await this.decryptCredentials(account.credentials, tenantId, accountId);
        if (result && typeof result === 'object' && 'decrypted' in result) {
          credentials = result.decrypted;
          migratedBlob = result.migratedBlob || null;
        } else {
          credentials = result;
        }
      } catch (error: any) {
        this.logger.error(`Failed to decrypt credentials for account ${accountId}: ${error.message}`);
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.invalid_credentials_format',
          message: 'No se pudieron desencriptar las credenciales de la cuenta.',
        });
      }

      // Obtener QR code si es Evolution API
      let qrCodeUrl: string | null = null;
      if (account.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
        try {
          qrCodeUrl = await this.getProviderQRCode(account.provider, credentials);
        } catch (error) {
          this.logger.warn(`Failed to get QR code for account ${accountId}: ${error.message}`);
          // No fallar si no se puede obtener el QR, solo continuar sin él
        }
      }

      // Actualizar estado a PENDING
      const updateData: any = {
        status: $Enums.tenantwhatsappaccount_status.PENDING,
        qrCodeUrl,
        lastCheckedAt: new Date(),
      };
      
      // Si hay migración pendiente, incluir el blob migrado
      if (migratedBlob) {
        updateData.credentials = migratedBlob as any;
      }
      
      await this.prisma.tenantwhatsappaccount.update({
        where: { id: accountId },
        data: updateData,
      });

      return {
        success: true,
        data: {
          id: account.id,
          status: $Enums.tenantwhatsappaccount_status.PENDING,
          qrCodeUrl,
        },
      };
    } catch (error) {
      // Si ya es una excepción HTTP, relanzarla
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Para otros errores, loguear y lanzar una excepción genérica
      this.logger.error(`Unexpected error reconnecting account ${accountId}: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.reconnect_error',
        message: 'Error inesperado al reconectar la cuenta.',
      });
    }
  }

  /**
   * Obtiene el QR code de una cuenta (Evolution API)
   */
  async getQRCode(tenantId: string, accountId: string) {
        const account = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }

    if (account.provider !== $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.qr_not_available',
      });
    }

    // Descifrar credenciales
    let credentials: any;
    let migratedBlob: EncryptedBlobV1 | null = null;
    const result = await this.decryptCredentials(account.credentials, tenantId, accountId);
    if (result && typeof result === 'object' && 'decrypted' in result) {
      credentials = result.decrypted;
      migratedBlob = result.migratedBlob || null;
    } else {
      credentials = result;
    }
    
    // Si hay migración pendiente, actualizar en BD
    if (migratedBlob) {
      await this.prisma.tenantwhatsappaccount.update({
        where: { id: accountId },
        data: { credentials: migratedBlob as any },
      });
    }

    // Obtener QR code
    const qrCodeUrl = await this.getProviderQRCode(account.provider, credentials);

    if (qrCodeUrl) {
            await this.prisma.tenantwhatsappaccount.update({
        where: { id: accountId },
        data: { qrCodeUrl },
      });
    }

    return {
      success: true,
      data: {
        qrCodeUrl,
      },
    };
  }

  // Métodos privados para interactuar con providers

  private async validateCredentials(
    provider: $Enums.tenantwhatsappaccount_provider,
    credentials: any,
  ): Promise<boolean> {
    switch (provider) {
      case $Enums.tenantwhatsappaccount_provider.EVOLUTION_API:
        return this.evolutionProvider.validateCredentials(credentials);
      case $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD:
        return this.whatsappCloudProvider.validateCredentials(credentials);
      default:
        return false;
    }
  }

  private async getAccountInfo(provider: $Enums.tenantwhatsappaccount_provider, credentials: any) {
    switch (provider) {
      case $Enums.tenantwhatsappaccount_provider.EVOLUTION_API:
        return this.evolutionProvider.getAccountInfo(credentials);
      case $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD:
        return this.whatsappCloudProvider.getAccountInfo(credentials);
      default:
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.unsupported_provider',
        });
    }
  }

  private async getProviderQRCode(provider: $Enums.tenantwhatsappaccount_provider, credentials: any): Promise<string | null> {
    switch (provider) {
      case $Enums.tenantwhatsappaccount_provider.EVOLUTION_API:
        return this.evolutionProvider.getQRCode(credentials);
      case $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD:
        return this.whatsappCloudProvider.getQRCode(credentials);
      default:
        return null;
    }
  }
}

