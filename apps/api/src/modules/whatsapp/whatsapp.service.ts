import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionUtil } from './utils/encryption.util';
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
    private evolutionProvider: EvolutionProvider,
    private whatsappCloudProvider: WhatsAppCloudProvider,
  ) {}

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

    return {
      success: true,
      data: accounts.map((acc) => {
        // Obtener credenciales enmascaradas
        let maskedCredentials = '****';
        try {
          const decrypted = EncryptionUtil.decrypt(acc.credentials);
          const creds = JSON.parse(decrypted);
          // Enmascarar según el proveedor
          if (acc.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
            maskedCredentials = EncryptionUtil.mask(creds.apiKey || '');
          } else if (acc.provider === $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD) {
            maskedCredentials = EncryptionUtil.mask(creds.accessToken || '');
          }
        } catch (error) {
          this.logger.warn(`Failed to decrypt credentials for account ${acc.id}`);
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
      }),
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
      const decrypted = EncryptionUtil.decrypt(account.credentials);
      const creds = JSON.parse(decrypted);
      if (account.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
        maskedCredentials = EncryptionUtil.mask(creds.apiKey || '');
      } else if (account.provider === $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD) {
        maskedCredentials = EncryptionUtil.mask(creds.accessToken || '');
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

    // Encriptar credenciales
    const encryptedCredentials = EncryptionUtil.encrypt(JSON.stringify(dto.credentials));

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
        credentials: encryptedCredentials,
        displayName: accountInfo.displayName,
        instanceName: dto.credentials.instanceName || null,
        qrCodeUrl,
        connectedAt: accountInfo.status === 'connected' ? new Date() : null,
        lastCheckedAt: new Date(),
      }),
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
      const isValid = await this.validateCredentials(account.provider, dto.credentials);
      if (!isValid) {
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.invalid_credentials',
        });
      }

      const accountInfo = await this.getAccountInfo(account.provider, dto.credentials);
      updateData.credentials = EncryptionUtil.encrypt(JSON.stringify(dto.credentials));
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

      // Desencriptar credenciales
      let credentials;
      try {
        credentials = JSON.parse(EncryptionUtil.decrypt(account.credentials));
      } catch (error) {
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

        await this.prisma.tenantwhatsappaccount.update({
          where: { id: accountId },
          data: {
            status: $Enums.tenantwhatsappaccount_status.CONNECTED,
            displayName: accountInfo.displayName,
            lastCheckedAt: new Date(),
            connectedAt: account.connectedAt || new Date(),
          },
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

      // Desencriptar credenciales
      let credentials;
      try {
        credentials = JSON.parse(EncryptionUtil.decrypt(account.credentials));
      } catch (error) {
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
      await this.prisma.tenantwhatsappaccount.update({
        where: { id: accountId },
        data: {
          status: $Enums.tenantwhatsappaccount_status.PENDING,
          qrCodeUrl,
          lastCheckedAt: new Date(),
        },
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

    // Desencriptar credenciales
    const credentials = JSON.parse(EncryptionUtil.decrypt(account.credentials));

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

