import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
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
import { ConnectEvolutionDto, validateConnectEvolutionDto } from './dto/connect-evolution.dto';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { createData } from '../../common/prisma/create-data.helper';
import { randomUUID } from 'crypto';
import {
  isLegacyFormat,
  assertAccountOwnedOrLegacyOverride,
  validateInstanceName,
  canOperateLegacyAccountWithoutDecrypt,
} from './whatsapp.policy';

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
   * Helper para detectar si las credenciales están en formato legacy
   * Delegado a whatsapp.policy.ts (Single Source of Truth)
   */
  private isLegacyFormat(credentials: any): boolean {
    return isLegacyFormat(credentials);
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
    // Si credentials es un string, parsearlo a objeto
    let blob: EncryptedBlobV1;
    if (typeof credentials === 'string') {
      try {
        blob = JSON.parse(credentials);
      } catch (error) {
        // Si no es JSON válido, puede ser formato legacy
        if (isLegacyFormat(credentials)) {
          throw new Error(
            `Legacy format detected for record ${recordId}. Please run the migration script: npm run migrate-crypto-legacy`
          );
        }
        throw new Error(`Invalid credentials format for record ${recordId}`);
      }
    } else {
      blob = credentials as EncryptedBlobV1;
    }

    // Validar que es formato nuevo (EncryptedBlobV1)
    if (isLegacyFormat(blob)) {
      throw new Error(
        `Legacy format detected for record ${recordId}. Please run the migration script: npm run migrate-crypto-legacy`
      );
    }

    // Usar CryptoService (formato nuevo)
    // IMPORTANTE: tenantId y recordId deben ser EXACTAMENTE los mismos usados en encrypt
    try {
      this.logger.debug(
        `decryptCredentials: attempting decrypt - tenantId=${tenantId}, recordId=${recordId}, blobVersion=${blob.v}, keyVersion=${blob.keyVersion}`
      );
      
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
      this.logger.warn(
        `Failed to decrypt credentials for record ${recordId} - tenantId=${tenantId}, recordId=${recordId}, blobVersion=${blob.v}, keyVersion=${blob.keyVersion}`
      );
      throw error;
    }
  }

  /**
   * Helper para cifrar credenciales (siempre usa el nuevo formato)
   * Retorna el objeto EncryptedBlobV1 (no stringificado)
   */
  /**
   * Helper para cifrar credenciales (siempre usa el nuevo formato EncryptedBlobV1)
   * AÑADIR ASERCIÓN DURA: Si el resultado es legacy => throw InternalServerError
   */
  private encryptCredentials(
    credentials: any,
    tenantId: string,
    recordId: string,
  ): EncryptedBlobV1 {
    const encrypted = this.cryptoService.encryptJson(credentials, { tenantId, recordId });
    
    // ASERCIÓN DURA: Verificar que NO es formato legacy
    if (isLegacyFormat(encrypted)) {
      this.logger.error(
        `BUG: encryptCredentials produced legacy format for tenantId=${tenantId}, recordId=${recordId}. This should never happen.`
      );
      throw new InternalServerErrorException({
        success: false,
        error_key: 'whatsapp.encryption_error',
        message: 'Error interno: el cifrado produjo formato legacy. Contacte al administrador.',
      });
    }
    
    return encrypted;
  }

  /**
   * Helper para preparar credentials para guardar en Prisma
   * Convierte el objeto EncryptedBlobV1 a JSON string si es necesario
   */
  private prepareCredentialsForStorage(credentials: any): string {
    // Si ya es string, verificar que no sea doble stringify
    if (typeof credentials === 'string') {
      try {
        // Intentar parsear para verificar que es JSON válido
        JSON.parse(credentials);
        return credentials; // Ya es JSON string válido
      } catch {
        // Si no es JSON válido, puede ser formato legacy o error
        // En este caso, devolver como está (pero debería migrarse)
        return credentials;
      }
    }
    // Si es objeto, convertirlo a JSON string
    return JSON.stringify(credentials);
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
                data: { credentials: this.prepareCredentialsForStorage(result.migratedBlob) },
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
  /**
   * Helper interno: obtiene cuenta por ID sin validar ownership (solo para obtener provider)
   * NO usar para operaciones que requieren validación de ownership
   */
  async getAccountByIdUnsafe(accountId: string) {
    const account = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
      select: { provider: true },
    });
    return account;
  }

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
          data: { credentials: this.prepareCredentialsForStorage(result.migratedBlob) },
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
        // @ts-ignore - Prisma Client regenerado
        connectionId: account.connectionId || undefined,
        // @ts-ignore - Prisma Client regenerado
        statusReason: account.statusReason || undefined,
        // @ts-ignore - Prisma Client regenerado
        lastSyncedAt: account.lastSyncedAt || undefined,
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
    this.logger.log(
      `createAccount: starting [LEGACY FLOW] - tenantId=${tenantId}, provider=${dto.provider}, hasInstanceName=${!!dto.credentials.instanceName}`
    );
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

    // Cifrar credenciales usando el nuevo formato (SIEMPRE formato nuevo)
    // Nota: accountId aún no existe, usamos un ID temporal que se actualizará después
    const tempRecordId = `temp-${Date.now()}`;
    const encryptedCredentials = this.encryptCredentials(dto.credentials, tenantId, tempRecordId);
    
    // Verificación: asegurar que NO es formato legacy
    if (isLegacyFormat(encryptedCredentials)) {
      this.logger.error(
        `createAccount: CRITICAL - encrypted credentials are in legacy format! tenantId=${tenantId}, provider=${dto.provider}`
      );
      throw new InternalServerErrorException({
        success: false,
        error_key: 'whatsapp.persistence_error',
        message: 'Error interno: las credenciales se guardaron en formato legacy. Contacta soporte.',
      });
    }

    // Verificar si ya existe una cuenta duplicada
    // Para Evolution API: verificar por tenantId + provider + instanceName
    // Para WhatsApp Cloud: verificar por tenantId + provider + phoneNumber
    let existingAccount;
    if (dto.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API && dto.credentials.instanceName) {
      existingAccount = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          tenantId,
          provider: dto.provider,
          instanceName: dto.credentials.instanceName,
        },
      });
    } else {
      // Para WhatsApp Cloud o Evolution sin instanceName, verificar por phoneNumber
      existingAccount = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          tenantId,
          provider: dto.provider,
          phoneNumber: accountInfo.phoneNumber,
        },
      });
    }

    if (existingAccount) {
      throw new ConflictException({
        success: false,
        error_key: 'whatsapp.account_already_exists',
        message: 'whatsapp.account_already_exists',
        existingAccountId: existingAccount.id,
        instanceName: existingAccount.instanceName || dto.credentials.instanceName || null,
      });
    }

    // Obtener QR code si es necesario (Evolution API)
    let qrCodeUrl: string | null = null;
    if (dto.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      qrCodeUrl = await this.getProviderQRCode(dto.provider, dto.credentials);
    }

    // Crear cuenta
    let account;
    try {
      account = await this.prisma.tenantwhatsappaccount.create({
        data: createData({
          tenantId,
          provider: dto.provider,
          phoneNumber: accountInfo.phoneNumber,
          status: accountInfo.status === 'connected' ? $Enums.tenantwhatsappaccount_status.CONNECTED : $Enums.tenantwhatsappaccount_status.PENDING,
          credentials: this.prepareCredentialsForStorage(encryptedCredentials),
          displayName: accountInfo.displayName,
          instanceName: dto.credentials.instanceName || null,
          qrCodeUrl,
          connectedAt: accountInfo.status === 'connected' ? new Date() : null,
          lastCheckedAt: new Date(),
        }),
      });
    } catch (error: any) {
      // Detectar errores de duplicado de Prisma (P2002)
      if (error.code === 'P2002') {
        this.logger.warn(`Duplicate account detected: ${error.message}`);
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.account_already_exists',
          message: 'whatsapp.account_already_exists',
        });
      }
      // Detectar otros errores de validación de Prisma
      if (error.message?.includes('Invalid value provided') || error.message?.includes('Expected String')) {
        this.logger.error(`Prisma validation error creating account: ${error.message}`, error.stack);
        throw new InternalServerErrorException({
          success: false,
          error_key: 'whatsapp.persistence_error',
          message: 'No se pudo guardar la cuenta en la base de datos. Error de persistencia.',
        });
      }
      // Re-lanzar otros errores
      throw error;
    }

    // Re-cifrar con el recordId real (para context binding correcto) (SIEMPRE formato nuevo)
    const finalEncryptedCredentials = this.encryptCredentials(dto.credentials, tenantId, account.id);
    
    // Verificación: asegurar que NO es formato legacy
    if (isLegacyFormat(finalEncryptedCredentials)) {
      this.logger.error(
        `createAccount: CRITICAL - final encrypted credentials are in legacy format! accountId=${account.id}, tenantId=${tenantId}`
      );
      throw new InternalServerErrorException({
        success: false,
        error_key: 'whatsapp.persistence_error',
        message: 'Error interno: las credenciales se guardaron en formato legacy. Contacta soporte.',
      });
    }
    
    try {
      // Logs de crypto: verificar que se usa el mismo tenantId/recordId
      this.logger.log(
        `createAccount: credentials re-encrypted with final recordId - accountId=${account.id}, tenantId=${tenantId}, recordId=${account.id}, blobVersion=${finalEncryptedCredentials.v}, keyVersion=${finalEncryptedCredentials.keyVersion}`
      );
      
      await this.prisma.tenantwhatsappaccount.update({
        where: { id: account.id },
        data: { credentials: this.prepareCredentialsForStorage(finalEncryptedCredentials) },
      });
    } catch (error: any) {
      // Detectar errores de validación de Prisma
      if (error.code === 'P2002' || error.message?.includes('Invalid value provided') || error.message?.includes('Expected String')) {
        this.logger.error(`Prisma validation error updating account credentials: ${error.message}`, error.stack);
        // No fallar completamente, solo loguear el error (la cuenta ya fue creada)
        this.logger.warn(`Failed to update credentials with final recordId for account ${account.id}`);
      } else {
        // Re-lanzar otros errores
        throw error;
      }
    }

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
      const encryptedCreds = this.encryptCredentials(dto.credentials, tenantId, accountId);
      
      // Verificación: asegurar que NO es formato legacy
      if (isLegacyFormat(encryptedCreds)) {
        this.logger.error(
          `updateAccount: CRITICAL - encrypted credentials are in legacy format! accountId=${accountId}, tenantId=${tenantId}`
        );
        throw new InternalServerErrorException({
          success: false,
          error_key: 'whatsapp.persistence_error',
          message: 'Error interno: las credenciales se guardaron en formato legacy. Contacta soporte.',
        });
      }
      
      updateData.credentials = this.prepareCredentialsForStorage(encryptedCreds);
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
   * Usa policy central para validar ownership o legacy override
   */
  async deleteAccount(tenantId: string, accountId: string) {
    try {
      // Buscar cuenta sin filtrar por tenantId primero (para detectar legacy huérfana)
      const account = await this.prisma.tenantwhatsappaccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.account_not_found',
        });
      }

      // Validar ownership usando policy central
      assertAccountOwnedOrLegacyOverride({
        account: {
          id: account.id,
          tenantId: account.tenantId,
          instanceName: account.instanceName,
          credentials: account.credentials,
          status: account.status,
        },
        tenantId,
        action: 'deleteAccount',
      });

      // Verificar si está CONNECTED: debe desconectarse primero
      if (account.status === $Enums.tenantwhatsappaccount_status.CONNECTED) {
        throw new ConflictException({
          success: false,
          error_key: 'whatsapp.must_disconnect_first',
          message: 'La cuenta está conectada. Debe desconectarse antes de eliminarla.',
        });
      }

      // Eliminar dependencias y luego la cuenta
      await this.deleteAccountDependencies(tenantId, accountId);
      
      // Eliminar la cuenta
      await this.prisma.tenantwhatsappaccount.delete({
        where: { id: accountId },
      });

      return {
        success: true,
        data: { id: accountId },
      };
    } catch (error) {
      // Si ya es una excepción HTTP, relanzarla
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
   * Usa policy central para validar ownership (NO permite legacy override para validate)
   */
  async validateAccount(tenantId: string, accountId: string) {
    try {
      // Buscar cuenta sin filtrar por tenantId primero (para detectar legacy huérfana)
      const account = await this.prisma.tenantwhatsappaccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.account_not_found',
        });
      }

      // Validar ownership (validate NO permite legacy override)
      assertAccountOwnedOrLegacyOverride({
        account: {
          id: account.id,
          tenantId: account.tenantId,
          instanceName: account.instanceName,
          credentials: account.credentials,
          status: account.status,
        },
        tenantId,
        action: 'validateAccount',
      });

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
        
        // Si no se puede desencriptar (owned pero legacy/no decrypt), devolver 400
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.cannot_decrypt_credentials',
          message: 'No se pudieron desencriptar las credenciales de la cuenta. La cuenta puede estar en formato legacy.',
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
          updateData.credentials = this.prepareCredentialsForStorage(migratedBlob);
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
   * Usa policy central para validar ownership (NO permite legacy override para reconnect)
   */
  async reconnectAccount(tenantId: string, accountId: string) {
    try {
      // Buscar cuenta sin filtrar por tenantId primero (para detectar legacy huérfana)
      const account = await this.prisma.tenantwhatsappaccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.account_not_found',
        });
      }

      // Validar ownership (reconnect NO permite legacy override)
      assertAccountOwnedOrLegacyOverride({
        account: {
          id: account.id,
          tenantId: account.tenantId,
          instanceName: account.instanceName,
          credentials: account.credentials,
          status: account.status,
        },
        tenantId,
        action: 'reconnectAccount',
      });

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
        
        // Si no se puede desencriptar (owned pero legacy/no decrypt), devolver 400
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.cannot_decrypt_credentials',
          message: 'No se pudieron desencriptar las credenciales de la cuenta. La cuenta puede estar en formato legacy.',
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
        updateData.credentials = this.prepareCredentialsForStorage(migratedBlob);
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
        data: { credentials: this.prepareCredentialsForStorage(migratedBlob) },
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

  /**
   * Conecta Evolution API del tenant (guarda baseUrl + apiKey cifrados)
   * Flujo correcto: upsert con placeholder, cifrar UNA SOLA VEZ con connection.id
   */
  async connectEvolution(
    tenantId: string,
    dto: ConnectEvolutionDto,
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      tenantId: string;
      status: string;
      statusReason: string | null;
      lastTestAt: Date | null;
      createdAt: Date;
    };
  }> {
    // Validar baseUrl (SSRF)
    validateConnectEvolutionDto(dto);

    // Normalizar baseUrl (sin trailing slash)
    const normalizedUrl = dto.baseUrl.trim().replace(/\/+$/, '');

    // Testar conexión si se solicita
    let testResult: { success: boolean; statusReason?: string } | null = null;
    if (dto.testConnection) {
      testResult = await this.evolutionProvider.testConnection(normalizedUrl, dto.apiKey);
    }

    // Cifrar credenciales con CryptoService
    const credentials = {
      baseUrl: normalizedUrl,
      apiKey: dto.apiKey,
    };

    // Buscar conexión existente o crear nueva con placeholder
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const existingConnection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { tenantId },
    });

    let connectionId: string;

    if (existingConnection) {
      connectionId = existingConnection.id;
      
      // Cifrar UNA SOLA VEZ usando connection.id
      const encryptedBlob = this.cryptoService.encryptJson(credentials, {
        tenantId,
        recordId: connectionId,
      });

      // @ts-ignore - Prisma Client regenerado
      await this.prisma.tenantevolutionconnection.update({
        where: { id: connectionId },
        data: {
          status: testResult?.success ? 'CONNECTED' : testResult?.statusReason ? 'ERROR' : 'DISCONNECTED',
          statusReason: testResult?.statusReason || null,
          encryptedCredentials: JSON.stringify(encryptedBlob),
          // @ts-ignore - Prisma Client regenerado
          normalizedUrl: normalizedUrl,
          lastTestAt: testResult ? new Date() : existingConnection.lastTestAt,
          updatedAt: new Date(),
        },
      });
    } else {
      // Crear nueva conexión con placeholder ('' o null)
      // @ts-ignore - Prisma Client regenerado
      const created = await this.prisma.tenantevolutionconnection.create({
        data: createData({
          tenantId,
          status: testResult?.success ? 'CONNECTED' : testResult?.statusReason ? 'ERROR' : 'DISCONNECTED',
          statusReason: testResult?.statusReason || null,
          encryptedCredentials: '', // Placeholder
          // @ts-ignore - Prisma Client regenerado
          normalizedUrl: normalizedUrl,
          lastTestAt: testResult ? new Date() : null,
        }),
      });

      connectionId = created.id;

      // Cifrar UNA SOLA VEZ usando connection.id real
      const encryptedBlob = this.cryptoService.encryptJson(credentials, {
        tenantId,
        recordId: connectionId,
      });

      // @ts-ignore - Prisma Client regenerado
      await this.prisma.tenantevolutionconnection.update({
        where: { id: connectionId },
        data: {
          encryptedCredentials: JSON.stringify(encryptedBlob),
        },
      });
    }

    // @ts-ignore - Prisma Client regenerado
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { id: connectionId },
    });

    return {
      success: true,
      data: {
        id: connection!.id,
        tenantId: connection!.tenantId,
        status: connection!.status,
        statusReason: connection!.statusReason,
        lastTestAt: connection!.lastTestAt,
        createdAt: connection!.createdAt,
      },
    };
  }

  /**
   * Testa conexión Evolution API del tenant
   */
  async testEvolutionConnection(tenantId: string): Promise<{
    success: boolean;
    data: {
      status: string;
      statusReason: string | null;
      lastTestAt: Date;
    };
  }> {
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { tenantId },
    });

    if (!connection) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.evolution_connection_not_found',
      });
    }

    // Descifrar credenciales
    const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
    const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
      encryptedBlob,
      {
        tenantId: connection.tenantId,
        recordId: connection.id,
      }
    );

    // Testar conexión
    const testResult = await this.evolutionProvider.testConnection(
      credentials.baseUrl,
      credentials.apiKey,
    );

    // Actualizar estado
    // @ts-ignore - Prisma Client regenerado
    const updated = await this.prisma.tenantevolutionconnection.update({
      where: { id: connection.id },
      data: {
        status: testResult.success ? 'CONNECTED' : 'ERROR',
        statusReason: testResult.statusReason || null,
        lastTestAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        status: updated.status,
        statusReason: updated.statusReason,
        lastTestAt: updated.lastTestAt!,
      },
    };
  }

  /**
   * Obtiene estado de conexión Evolution del tenant
   */
  async getEvolutionConnectionStatus(tenantId: string) {
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { tenantId },
    });

    if (!connection) {
      return {
        success: true,
        data: {
          status: 'DISCONNECTED',
          statusReason: null,
          lastTestAt: null,
        },
      };
    }

    return {
      success: true,
      data: {
        status: connection.status,
        statusReason: connection.statusReason,
        lastTestAt: connection.lastTestAt,
      },
    };
  }

  /**
   * Genera nombre de instancia con prefijo obligatorio
   */
  private generateInstanceName(tenantId: string, suffix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const customSuffix = suffix || `${timestamp}-${random}`;
    return `tenant-${tenantId}-${customSuffix}`;
  }

  /**
   * Valida que instanceName pertenece al tenant
   * Delegado a whatsapp.policy.ts (Single Source of Truth)
   */
  private validateInstanceName(instanceName: string, tenantId: string): boolean {
    return validateInstanceName(instanceName, tenantId);
  }

  /**
   * Normaliza instanceName agregando prefijo tenant-{tenantId}- si falta
   * Si el nombre ya tiene el prefijo correcto, lo devuelve tal cual
   * Si viene vacío o null, retorna null (se generará automáticamente)
   */
  private normalizeInstanceName(instanceName: string | undefined | null, tenantId: string): string | null {
    if (!instanceName || instanceName.trim() === '') {
      return null; // Se generará automáticamente
    }
    
    const trimmed = instanceName.trim();
    const prefix = `tenant-${tenantId}-`;
    
    // Si ya tiene el prefijo correcto, devolverlo tal cual
    if (trimmed.startsWith(prefix)) {
      return trimmed;
    }
    
    // Si no tiene prefijo, agregarlo
    // Limpiar caracteres inválidos del nombre (solo alfanuméricos, guiones y guiones bajos)
    const cleanName = trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');
    const normalized = `${prefix}${cleanName}`;
    
    // Validar longitud máxima (50 caracteres)
    if (normalized.length > 50) {
      // Truncar manteniendo el prefijo
      const maxSuffixLength = 50 - prefix.length;
      const truncatedSuffix = cleanName.substring(0, maxSuffixLength);
      return `${prefix}${truncatedSuffix}`;
    }
    
    return normalized;
  }

  /**
   * Helper centralizado: obtiene cuenta y valida ownership usando policy
   * Úsalo para operaciones que requieren validación de ownership
   */
  async getAccountOrThrow(
    accountId: string,
    tenantId: string,
    action: string,
  ) {
    const account = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }

    // Validar ownership usando policy central
    assertAccountOwnedOrLegacyOverride({
      account: {
        id: account.id,
        tenantId: account.tenantId,
        instanceName: account.instanceName,
        credentials: account.credentials,
        status: account.status,
      },
      tenantId,
      action,
    });

    return account;
  }

  /**
   * Elimina dependencias antes de borrar una cuenta para evitar errores de FK
   * Orden de eliminación (transaccional):
   * 1. Mensajes (FK a conversation)
   * 2. Appointments (FK a conversation)
   * 3. Conversations (FK a whatsappAccountId)
   * 4. N8nFlows (FK a agentId, set null)
   * 5. Agents (FK a whatsappAccountId)
   * NOTA: La cuenta se elimina DESPUÉS de llamar a este método
   */
  private async deleteAccountDependencies(tenantId: string, accountId: string) {
    this.logger.log(
      `Deleting account dependencies: accountId=${accountId}, tenantId=${tenantId}`
    );
    
    const counts = {
      messages: 0,
      appointments: 0,
      conversations: 0,
      agents: 0,
      n8nflowsUpdated: 0,
    };
    
    await this.prisma.$transaction(async (tx) => {
      // 1. Obtener conversaciones relacionadas
      const conversations = await tx.conversation.findMany({
        where: { tenantId, whatsappAccountId: accountId },
        select: { id: true },
      });
      const conversationIds = conversations.map((c) => c.id);

      // 2. Eliminar mensajes (FK a conversation)
      if (conversationIds.length > 0) {
        const result = await tx.message.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
        counts.messages = result.count;
      }

      // 3. Eliminar appointments (FK a conversation)
      if (conversationIds.length > 0) {
        const result = await tx.appointment.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
        counts.appointments = result.count;
      }

      // 4. Eliminar conversaciones
      const conversationsResult = await tx.conversation.deleteMany({
        where: { tenantId, whatsappAccountId: accountId },
      });
      counts.conversations = conversationsResult.count;

      // 5. Obtener agentes relacionados
      const agents = await tx.agent.findMany({
        where: { tenantId, whatsappAccountId: accountId },
        select: { id: true },
      });
      const agentIds = agents.map((a) => a.id);

      // 6. Limpiar referencias en n8nflows (set null)
      if (agentIds.length > 0) {
        const n8nResult = await tx.n8nflow.updateMany({
          where: { agentId: { in: agentIds } },
          data: { agentId: null },
        });
        counts.n8nflowsUpdated = n8nResult.count;
      }

      // 7. Eliminar agentes (FK a whatsappAccountId)
      const agentsResult = await tx.agent.deleteMany({
        where: { tenantId, whatsappAccountId: accountId },
      });
      counts.agents = agentsResult.count;
    });

    this.logger.log(
      `Account dependencies deleted: accountId=${accountId}, tenantId=${tenantId}, ` +
      `messages=${counts.messages}, appointments=${counts.appointments}, ` +
      `conversations=${counts.conversations}, agents=${counts.agents}, ` +
      `n8nflowsUpdated=${counts.n8nflowsUpdated}`
    );
  }

  /**
   * Crea una nueva instancia de Evolution API automáticamente
   * IMPORTANTE: Este método SÍ crea la instancia en Evolution API (POST /instance/create)
   */
  async createInstance(tenantId: string, dto: CreateInstanceDto) {
    this.logger.log(
      `createInstance: starting [NEW FLOW] - tenantId=${tenantId}, instanceName=${dto.instanceName || 'auto-generated'}, phoneNumber=${dto.phoneNumber || 'none'}`
    );

    // Verificar que la creación de instancias está habilitada
    const enableInstanceCreation = process.env.EVOLUTION_API_ENABLE_INSTANCE_CREATION !== 'false';
    if (!enableInstanceCreation) {
      this.logger.warn(`createInstance: instance creation disabled for tenantId=${tenantId}`);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.instance_creation_disabled',
        message: 'Instance creation is disabled. Please contact support.',
      });
    }

    // Verificar que tenant tiene conexión Evolution
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { tenantId },
    });

    if (!connection) {
      this.logger.warn(`createInstance: no Evolution connection found for tenantId=${tenantId}`);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.evolution_connection_not_found',
        message: 'Evolution API connection is required. Please connect your Evolution API first.',
      });
    }

    if (connection.status !== 'CONNECTED') {
      this.logger.warn(
        `createInstance: Evolution connection not connected - tenantId=${tenantId}, status=${connection.status}, statusReason=${connection.statusReason}`
      );
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.evolution_not_connected',
        message: `Evolution API connection is ${connection.status}. Please test and fix the connection first.`,
      });
    }

    // Verificar límite de instancias
    const existingAccounts = await this.prisma.tenantwhatsappaccount.count({
      where: {
        tenantId,
        provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
      },
    });

    const maxInstances = parseInt(
      process.env.EVOLUTION_API_MAX_INSTANCES_PER_TENANT || '10',
      10,
    );
    if (existingAccounts >= maxInstances) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.max_instances_reached',
        error_params: { max: maxInstances },
      });
    }

    // Generar o normalizar instanceName
    // Si el usuario proporciona un nombre, normalizarlo (agregar prefijo si falta)
    // Si viene vacío o null, generar automáticamente
    let instanceName: string;
    const normalized = this.normalizeInstanceName(dto.instanceName, tenantId);
    
    if (normalized) {
      instanceName = normalized;
      this.logger.log(
        `createInstance: instanceName normalized - original=${dto.instanceName || 'empty'}, normalized=${instanceName}, tenantId=${tenantId}`
      );
    } else {
      instanceName = this.generateInstanceName(tenantId);
      this.logger.log(
        `createInstance: instanceName auto-generated - instanceName=${instanceName}, tenantId=${tenantId}`
      );
    }

    // Verificar si ya existe una cuenta con el mismo instanceName
    const existingAccount = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        tenantId,
        provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
        instanceName,
      },
    });

    if (existingAccount) {
      throw new ConflictException({
        success: false,
        error_key: 'whatsapp.account_already_exists',
        message: 'whatsapp.account_already_exists',
        existingAccountId: existingAccount.id,
        instanceName: existingAccount.instanceName,
      });
    }

    // Descifrar credenciales
    const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
    const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
      encryptedBlob,
      {
        tenantId: connection.tenantId,
        recordId: connection.id,
      }
    );

    // @ts-ignore - Prisma Client regenerado
    const normalizedUrl = connection.normalizedUrl || credentials.baseUrl;

    this.logger.log(
      `createInstance: calling Evolution API - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceName}, hasPhoneNumber=${!!dto.phoneNumber}`
    );

    // Crear instancia en Evolution API del tenant (usar normalizedUrl)
    // ESTA ES LA LLAMADA REAL QUE CREA LA INSTANCIA EN EVOLUTION
    let instanceInfo;
    let statusCode: number | undefined;
    let responseBodySafe: any;
    
    try {
      instanceInfo = await this.evolutionProvider.createInstance(
        normalizedUrl,
        credentials.apiKey,
        {
          instanceName,
          phoneNumber: dto.phoneNumber || undefined,
        },
      );
      
      // Logs estructurados post-create
      this.logger.log(
        `createInstance: Evolution API success - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceInfo.instanceName}, status=${instanceInfo.status}, hasQR=${!!instanceInfo.qrCodeUrl}, instanceId=${instanceInfo.instanceId || 'none'}`
      );
    } catch (error: any) {
      statusCode = error.response?.status;
      responseBodySafe = error.response?.data ? {
        message: error.response.data.message,
        error: error.response.data.error,
        // NO incluir datos sensibles
      } : undefined;
      
      this.logger.error(
        `createInstance: Evolution API call failed - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceName}, statusCode=${statusCode}, error=${error.message}`,
        { responseBodySafe, stack: error.stack }
      );
      throw error;
    }

    // Determinar estado inicial
    const status =
      instanceInfo.status === 'open'
        ? $Enums.tenantwhatsappaccount_status.CONNECTED
        : $Enums.tenantwhatsappaccount_status.PENDING;

    // Preparar credenciales cifradas con binding temporal (SIEMPRE formato nuevo)
    const tempEncryptedCredentials = this.encryptCredentials(
      {
        baseUrl: normalizedUrl,
        apiKey: credentials.apiKey,
        instanceName,
      },
      tenantId,
      `temp-${Date.now()}`,
    );

    // Verificación: asegurar que NO es formato legacy
    if (isLegacyFormat(tempEncryptedCredentials)) {
      this.logger.error(
        `createInstance: CRITICAL - encrypted credentials are in legacy format! accountId will be generated, tenantId=${tenantId}`
      );
      throw new InternalServerErrorException({
        success: false,
        error_key: 'whatsapp.persistence_error',
        message: 'Error interno: las credenciales se guardaron en formato legacy. Contacta soporte.',
      });
    }

    // Crear registro en BD
    const account = await this.prisma.tenantwhatsappaccount.create({
      data: createData({
        tenantId,
        provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
        phoneNumber: dto.phoneNumber || null, // No guardar '' vacío, usar null
        status,
        credentials: this.prepareCredentialsForStorage(tempEncryptedCredentials),
        instanceName: instanceInfo.instanceName,
        qrCodeUrl: instanceInfo.qrCodeUrl,
        // @ts-ignore - Prisma Client regenerado
        // @ts-ignore - Prisma Client regenerado
        connectionId: connection.id,
        connectedAt: status === $Enums.tenantwhatsappaccount_status.CONNECTED ? new Date() : null,
        lastCheckedAt: new Date(),
      }),
    });

    // Re-cifrar con recordId real para binding correcto (SIEMPRE formato nuevo)
    try {
      const finalBlob = this.encryptCredentials(
        {
          baseUrl: normalizedUrl,
          apiKey: credentials.apiKey,
          instanceName,
        },
        tenantId,
        account.id,
      );

      // Verificación: asegurar que NO es formato legacy
      if (isLegacyFormat(finalBlob)) {
        this.logger.error(
          `createInstance: CRITICAL - final encrypted credentials are in legacy format! accountId=${account.id}, tenantId=${tenantId}`
        );
        throw new InternalServerErrorException({
          success: false,
          error_key: 'whatsapp.persistence_error',
          message: 'Error interno: las credenciales se guardaron en formato legacy. Contacta soporte.',
        });
      }

      await this.prisma.tenantwhatsappaccount.update({
        where: { id: account.id },
        data: { credentials: this.prepareCredentialsForStorage(finalBlob) },
      });
      
      // Logs de crypto: verificar que se guardó correctamente
      this.logger.log(
        `createInstance: credentials persisted - accountId=${account.id}, tenantId=${tenantId}, recordId=${account.id}, blobVersion=${finalBlob.v}, keyVersion=${finalBlob.keyVersion}`
      );
    } catch (error) {
      this.logger.error(
        `createInstance: Failed to persist final credentials for account ${account.id}: ${error.message}`,
        error.stack
      );
      // No fallar completamente, pero loguear como error crítico
    }

    // Verificación post-create opcional (solo si está habilitada)
    const enablePostCreateVerification = process.env.EVOLUTION_API_ENABLE_POST_CREATE_VERIFICATION === 'true';
    if (enablePostCreateVerification) {
      try {
        const allInstances = await this.evolutionProvider.listAllInstances(
          normalizedUrl,
          credentials.apiKey,
        );
        
        const foundInstance = allInstances.find(inst => inst.instanceName === instanceInfo.instanceName);
        
        if (foundInstance) {
          this.logger.log(
            `createInstance: post-create verification SUCCESS - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, found in fetchInstances with status=${foundInstance.status}`
          );
        } else {
          this.logger.warn(
            `createInstance: post-create verification WARNING - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, NOT found in fetchInstances (may be eventual consistency)`
          );
        }
      } catch (verifyError: any) {
        // No fallar si la verificación falla, solo loguear
        this.logger.warn(
          `createInstance: post-create verification failed - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, error=${verifyError.message}`
        );
      }
    }

    return {
      success: true,
      data: {
        id: account.id,
        instanceName: account.instanceName,
        status: account.status,
        qrCodeUrl: account.qrCodeUrl,
        phoneNumber: account.phoneNumber,
        createdAt: account.createdAt,
      },
    };
  }

  /**
   * Elimina una instancia (BD + Evolution API)
   * Usa policy central para validar ownership o legacy override
   */
  async deleteInstance(tenantId: string, accountId: string) {
    this.logger.log(
      `deleteInstance: accountId=${accountId}, tenantId=${tenantId}`
    );
    
    // Buscar cuenta sin filtrar por tenantId primero (para detectar legacy huérfana)
    const account = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
      // @ts-ignore - Prisma Client regenerado (include connection)
      include: {
        // @ts-ignore - Prisma Client regenerado, relación connection disponible después de migración
        connection: true,
      } as any,
    });

    if (!account) {
      this.logger.warn(
        `deleteInstance: account not found: accountId=${accountId}, tenantId=${tenantId}`
      );
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }
    
    this.logger.log(
      `deleteInstance: account found: accountId=${accountId}, tenantId=${tenantId}, instanceName=${account.instanceName}, status=${account.status}, isLegacy=${isLegacyFormat(account.credentials)}`
    );

    if (account.provider !== $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.only_evolution_supported',
      });
    }

    // Validar ownership usando policy central
    assertAccountOwnedOrLegacyOverride({
      account: {
        id: account.id,
        tenantId: account.tenantId,
        instanceName: account.instanceName,
        credentials: account.credentials,
        status: account.status,
      },
      tenantId,
      action: 'deleteInstance',
    });

    // Verificar si está CONNECTED: debe desconectarse primero
    if (account.status === $Enums.tenantwhatsappaccount_status.CONNECTED) {
      throw new ConflictException({
        success: false,
        error_key: 'whatsapp.must_disconnect_first',
        message: 'La cuenta está conectada. Debe desconectarse antes de eliminarla.',
      });
    }

    // Eliminar en Evolution API
    // @ts-ignore - Prisma Client regenerado
    if (account.instanceName && account.connection) {
      try {
        // @ts-ignore - Prisma Client regenerado
        const encryptedBlob: EncryptedBlobV1 = JSON.parse(account.connection.encryptedCredentials);
        const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
          encryptedBlob,
          {
            // @ts-ignore - Prisma Client regenerado
            tenantId: account.connection.tenantId,
            // @ts-ignore - Prisma Client regenerado
            recordId: account.connection.id,
          }
        );

        // @ts-ignore - Prisma Client regenerado
        const normalizedUrl = account.connection.normalizedUrl || credentials.baseUrl;
        
        await this.evolutionProvider.deleteInstance(
          normalizedUrl,
          credentials.apiKey,
          account.instanceName,
        );
      } catch (error: any) {
        this.logger.warn(`Failed to delete instance in Evolution API: ${error.message}`);
        // Continuar con eliminación en BD aunque falle en Evolution API
      }
    }

    // Eliminar dependencias y luego la cuenta
    await this.deleteAccountDependencies(tenantId, accountId);
    
    // Eliminar la cuenta
    await this.prisma.tenantwhatsappaccount.delete({
      where: { id: accountId },
    });

    return {
      success: true,
      data: {
        id: accountId,
        instanceName: account.instanceName,
        deleted: true,
      },
    };
  }

  /**
   * Conecta una instancia (obtiene nuevo QR)
   */
  async connectInstance(tenantId: string, accountId: string) {
    this.logger.log(
      `connectInstance: accountId=${accountId}, tenantId=${tenantId}`
    );
    
    // Buscar cuenta sin filtrar por tenantId (para detectar legacy owned)
    const account = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      this.logger.warn(
        `connectInstance: account not found: accountId=${accountId}, tenantId=${tenantId}`
      );
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }
    
    this.logger.log(
      `connectInstance: account found: accountId=${accountId}, tenantId=${tenantId}, instanceName=${account.instanceName}, status=${account.status}, isLegacy=${isLegacyFormat(account.credentials)}`
    );

    if (account.provider !== $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.only_evolution_supported',
      });
    }

    // @ts-ignore - Prisma Client regenerado
    if (!account.connectionId) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.evolution_connection_not_found',
      });
    }

    // Validar ownership o legacy override (Single Source of Truth)
    assertAccountOwnedOrLegacyOverride({
      account: {
        id: account.id,
        tenantId: account.tenantId,
        instanceName: account.instanceName,
        credentials: account.credentials,
        status: account.status,
      },
      tenantId,
      action: 'connectInstance',
    });

    // Obtener conexión y descifrar credenciales
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      // @ts-ignore - Prisma Client regenerado
      where: { id: account.connectionId },
    });

    if (!connection) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.evolution_connection_not_found',
      });
    }

    const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
    const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
      encryptedBlob,
      {
        tenantId: connection.tenantId,
        recordId: connection.id,
      }
    );

    // @ts-ignore - Prisma Client regenerado
    const normalizedUrl = connection.normalizedUrl || credentials.baseUrl;

    // Verificar que la instancia existe en Evolution antes de conectar
    if (!account.instanceName) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.instance_not_configured',
        message: 'Instance name is not configured for this account.',
      });
    }

    this.logger.log(
      `connectInstance: calling Evolution API - baseUrl=${normalizedUrl}, instanceName=${account.instanceName}`
    );

    // Conectar instancia (obtiene nuevo QR)
    let connectResult;
    try {
      connectResult = await this.evolutionProvider.connectInstance(
        normalizedUrl,
        credentials.apiKey,
        account.instanceName,
      );
      
      this.logger.log(
        `connectInstance: Evolution API response - instanceName=${account.instanceName}, status=${connectResult.status}, hasQR=${!!connectResult.qrCodeUrl}`
      );
    } catch (error: any) {
      // Si el error es 404, la instancia no existe en Evolution
      if (error.response?.status === 404 || error.error_key === 'whatsapp.instance_not_found') {
        this.logger.warn(
          `connectInstance: instance not found in Evolution - instanceName=${account.instanceName}, tenantId=${tenantId}`
        );
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.instance_not_found',
          message: `Instance '${account.instanceName}' not found in Evolution API. The instance may have been deleted externally.`,
        });
      }
      
      this.logger.error(
        `connectInstance: Evolution API call failed - instanceName=${account.instanceName}, error=${error.message}`,
        error.stack
      );
      throw error;
    }

    // Actualizar en BD
    await this.prisma.tenantwhatsappaccount.update({
      where: { id: accountId },
      data: {
        status: $Enums.tenantwhatsappaccount_status.PENDING,
        qrCodeUrl: connectResult.qrCodeUrl,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        id: accountId,
        qrCodeUrl: connectResult.qrCodeUrl,
        status: 'PENDING',
      },
    };
  }

  /**
   * Desconecta una instancia
   */
  async disconnectInstance(tenantId: string, accountId: string) {
    this.logger.log(
      `disconnectInstance: accountId=${accountId}, tenantId=${tenantId}`
    );
    
    // Buscar cuenta sin filtrar por tenantId (para detectar legacy owned)
    const account = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      this.logger.warn(
        `disconnectInstance: account not found: accountId=${accountId}, tenantId=${tenantId}`
      );
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }
    
    this.logger.log(
      `disconnectInstance: account found: accountId=${accountId}, tenantId=${tenantId}, instanceName=${account.instanceName}, status=${account.status}, isLegacy=${isLegacyFormat(account.credentials)}`
    );

    if (account.provider !== $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.only_evolution_supported',
      });
    }

    // Validar ownership (ownership se determina SOLO por tenantId)
    assertAccountOwnedOrLegacyOverride({
      account: {
        id: account.id,
        tenantId: account.tenantId,
        instanceName: account.instanceName,
        credentials: account.credentials,
        status: account.status,
      },
      tenantId,
      action: 'disconnectInstance',
    });

    // @ts-ignore - Prisma Client regenerado
    if (!account.connectionId) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.evolution_connection_not_found',
      });
    }

    // Verificar si puede operarse sin decrypt (legacy owned)
    const legacyOp = canOperateLegacyAccountWithoutDecrypt({
      account: {
        tenantId: account.tenantId,
        credentials: account.credentials,
        status: account.status,
      },
      action: 'disconnectInstance',
    });

    // Obtener conexión y descifrar credenciales (siempre desde connection, no account)
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      // @ts-ignore - Prisma Client regenerado
      where: { id: account.connectionId },
    });

    if (!connection) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.evolution_connection_not_found',
      });
    }

    const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
    const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
      encryptedBlob,
      {
        tenantId: connection.tenantId,
        recordId: connection.id,
      }
    );

    // @ts-ignore - Prisma Client regenerado
    const normalizedUrl = connection.normalizedUrl || credentials.baseUrl;

    // Desconectar instancia (usar instanceName del account, aunque no se pueda decrypt account.credentials)
    if (!account.instanceName) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.instance_not_configured',
        message: 'Instance name is not configured for this account.',
      });
    }

    this.logger.log(
      `disconnectInstance: calling Evolution API - baseUrl=${normalizedUrl}, instanceName=${account.instanceName}`
    );

    // Intentar desconectar en Evolution API
    // Si la conexión no existe, tratarlo como éxito (idempotencia)
    let disconnectResult;
    let connectionNotFound = false;
    
    try {
      disconnectResult = await this.evolutionProvider.disconnectInstance(
        normalizedUrl,
        credentials.apiKey,
        account.instanceName,
      );
      
      connectionNotFound = disconnectResult.connectionNotFound;
      
      if (connectionNotFound) {
        this.logger.log(
          `disconnectInstance: Connection not found in Evolution API for instanceName=${account.instanceName}. Treating as already disconnected.`
        );
      } else {
        this.logger.log(
          `disconnectInstance: Successfully disconnected instance in Evolution API - instanceName=${account.instanceName}`
        );
      }
    } catch (error: any) {
      // Verificar si el error indica "connection not found" o "instance not found"
      const isConnectionNotFoundError = 
        error.response?.status === 404 ||
        error.response?.data?.message?.toLowerCase().includes('connection') ||
        error.response?.data?.message?.toLowerCase().includes('not found') ||
        error.response?.data?.message?.toLowerCase().includes('instance') ||
        error.error_key === 'whatsapp.evolution_connection_not_found' ||
        error.error_key === 'whatsapp.instance_not_found' ||
        error.message?.toLowerCase().includes('connection not found') ||
        error.message?.toLowerCase().includes('instance not found');
      
      if (isConnectionNotFoundError) {
        this.logger.log(
          `disconnectInstance: Connection/instance not found error caught for instanceName=${account.instanceName}. Treating as already disconnected.`
        );
        connectionNotFound = true;
      } else {
        // Para errores graves (401, 403, 500, etc.), lanzar excepción
        this.logger.error(
          `disconnectInstance: Failed to disconnect instance ${account.instanceName}: error=${error.message}, statusCode=${error.response?.status}`,
          error.stack
        );
        throw error;
      }
    }

    // Actualizar estado en BD a DISCONNECTED (idempotente)
    // Si la conexión no existe en Evolution, actualizar estado para sincronizar
    await this.prisma.tenantwhatsappaccount.update({
      where: { id: accountId },
      data: {
        status: $Enums.tenantwhatsappaccount_status.DISCONNECTED,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Si la conexión no existía, intentar verificar estado real (opcional)
    if (connectionNotFound) {
      try {
        const statusInfo = await this.evolutionProvider.getInstanceStatus(
          normalizedUrl,
          credentials.apiKey,
          account.instanceName,
        );
        
        // Si el estado es 'close', confirmar que está desconectado
        if (statusInfo.status === 'close') {
          this.logger.debug(
            `disconnectInstance: Confirmed instance ${account.instanceName} is closed in Evolution API`
          );
        }
      } catch (statusError: any) {
        // Si falla el getStatus, no es crítico (puede ser 404 también)
        this.logger.debug(
          `disconnectInstance: Could not verify status for ${account.instanceName}: ${statusError.message}`
        );
      }
    }

    // Retornar éxito con información sobre si ya estaba desconectada
    return {
      success: true,
      data: {
        id: accountId,
        status: 'DISCONNECTED',
        reason: connectionNotFound ? 'already_disconnected_or_connection_missing' : undefined,
      },
    };
  }

  /**
   * Obtiene estado detallado de una instancia
   */
  async getInstanceStatus(tenantId: string, accountId: string) {
    this.logger.log(
      `getInstanceStatus: accountId=${accountId}, tenantId=${tenantId}`
    );
    
    // Buscar cuenta sin filtrar por tenantId (para detectar legacy owned)
    const account = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      this.logger.warn(
        `getInstanceStatus: account not found: accountId=${accountId}, tenantId=${tenantId}`
      );
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }
    
    this.logger.log(
      `getInstanceStatus: account found: accountId=${accountId}, tenantId=${tenantId}, instanceName=${account.instanceName}, status=${account.status}, isLegacy=${isLegacyFormat(account.credentials)}`
    );

    if (account.provider !== $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.only_evolution_supported',
      });
    }

    // @ts-ignore - Prisma Client regenerado
    // @ts-ignore - Prisma Client regenerado (connectionId field)
    const connectionId = account.connectionId;
    
    if (!connectionId || !account.instanceName) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.instance_not_configured',
      });
    }

    // Validar ownership o legacy override (Single Source of Truth)
    assertAccountOwnedOrLegacyOverride({
      account: {
        id: account.id,
        tenantId: account.tenantId,
        instanceName: account.instanceName,
        credentials: account.credentials,
        status: account.status,
      },
      tenantId,
      action: 'connectInstance',
    });

    // Obtener conexión y descifrar credenciales
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.evolution_connection_not_found',
      });
    }

    const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
    const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
      encryptedBlob,
      {
        tenantId: connection.tenantId,
        recordId: connection.id,
      }
    );

    // @ts-ignore - Prisma Client regenerado
    const normalizedUrl = connection.normalizedUrl || credentials.baseUrl;

    this.logger.log(
      `getInstanceStatus: calling Evolution API - baseUrl=${normalizedUrl}, instanceName=${account.instanceName}`
    );

    // Obtener estado de Evolution API (consulta real)
    let statusInfo;
    try {
      statusInfo = await this.evolutionProvider.getInstanceStatus(
        normalizedUrl,
        credentials.apiKey,
        account.instanceName,
      );
      
      this.logger.log(
        `getInstanceStatus: Evolution API response - instanceName=${account.instanceName}, status=${statusInfo.status}, phoneNumber=${statusInfo.phoneNumber || 'none'}`
      );
    } catch (error: any) {
      // Si el error es 404, la instancia no existe en Evolution
      if (error.response?.status === 404 || error.error_key === 'whatsapp.instance_not_found') {
        this.logger.warn(
          `getInstanceStatus: instance not found in Evolution - instanceName=${account.instanceName}, tenantId=${tenantId}`
        );
        // Actualizar estado en BD a ERROR
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: accountId },
          data: {
            status: $Enums.tenantwhatsappaccount_status.ERROR,
            lastCheckedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        
        throw new NotFoundException({
          success: false,
          error_key: 'whatsapp.instance_not_found',
          message: `Instance '${account.instanceName}' not found in Evolution API. The instance may have been deleted externally.`,
        });
      }
      
      this.logger.error(
        `getInstanceStatus: Evolution API call failed - instanceName=${account.instanceName}, error=${error.message}`,
        error.stack
      );
      throw error;
    }

    // Mapear estado
    const newStatus = this.mapEvolutionStatusToAccountStatus(statusInfo.status);

    // Actualizar en BD
    await this.prisma.tenantwhatsappaccount.update({
      where: { id: accountId },
      data: {
        status: newStatus,
        phoneNumber: statusInfo.phoneNumber || account.phoneNumber || null, // No guardar '' vacío
        displayName: statusInfo.displayName || account.displayName,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const updated = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
    });

    return {
      success: true,
      data: {
        id: updated!.id,
        instanceName: updated!.instanceName,
        status: updated!.status,
        // @ts-ignore - Prisma Client regenerado
        statusReason: updated!.statusReason,
        phoneNumber: updated!.phoneNumber,
        displayName: updated!.displayName,
        // @ts-ignore - Prisma Client regenerado
        lastSyncedAt: updated!.lastSyncedAt,
        connectedAt: updated!.connectedAt,
      },
    };
  }

  /**
   * Sincroniza instancias con Evolution API del tenant
   * IMPORTANTE: 1 fetchInstances por tenant → reconcile todas las instancias
   */
  async syncInstances(tenantId: string) {
    // Obtener conexión Evolution del tenant
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { tenantId },
    });

    if (!connection || connection.status !== 'CONNECTED') {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.evolution_not_connected',
      });
    }

    // Descifrar credenciales
    const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
    const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
      encryptedBlob,
      {
        tenantId: connection.tenantId,
        recordId: connection.id,
      }
    );

    // Obtener todas las instancias del tenant en BD
    const accounts = await this.prisma.tenantwhatsappaccount.findMany({
      where: {
        tenantId,
        provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
        // @ts-ignore - Prisma Client regenerado
        // @ts-ignore - Prisma Client regenerado
        connectionId: connection.id,
      },
    });

    // Obtener todas las instancias de Evolution API del tenant (1 llamada)
    // @ts-ignore - Prisma Client regenerado
    const normalizedUrl = connection.normalizedUrl || credentials.baseUrl;
    
    let evolutionInstances: Array<{
      instanceName: string;
      status: 'open' | 'close' | 'connecting';
      phoneNumber?: string;
    }>;
    let consecutiveFailures = 0;
    try {
      evolutionInstances = await this.evolutionProvider.listAllInstances(
        normalizedUrl,
        credentials.apiKey,
      );
      
      // Resetear contador de fallos si éxito
      consecutiveFailures = 0;
    } catch (error: any) {
      consecutiveFailures = (connection as any).consecutiveFailures || 0;
      consecutiveFailures++;
      
      // Si falla, puede ser error de credenciales
      if (error.response?.status === 401 || error.response?.status === 403) {
        // @ts-ignore - Prisma Client regenerado
        await this.prisma.tenantevolutionconnection.update({
          where: { id: connection.id },
          data: {
            status: 'ERROR',
            statusReason: 'INVALID_CREDENTIALS',
            updatedAt: new Date(),
          },
        });
        throw error;
      }
      
      // Marcar connection ERROR si hay fallos repetidos (backoff mínimo)
      if (consecutiveFailures >= 3) {
        // @ts-ignore - Prisma Client regenerado
        await this.prisma.tenantevolutionconnection.update({
          where: { id: connection.id },
          data: {
            status: 'ERROR',
            statusReason: 'TRANSIENT_ERROR',
            updatedAt: new Date(),
          },
        });
      }
      
      throw error;
    }

    // Indexar instancias de Evolution por nombre
    const evolutionIndex = new Map<string, typeof evolutionInstances[0]>();
    for (const inst of evolutionInstances) {
      evolutionIndex.set(inst.instanceName, inst);
    }

    let synced = 0;
    let updated = 0;
    let orphaned = 0;
    const errors: Array<{ instanceName: string; error: string }> = [];

    // Reconciliar: actualizar estados en BD según Evolution API
    for (const account of accounts) {
      try {
        if (!account.instanceName) {
          continue;
        }

        // Validar que instanceName pertenece al tenant (ownership)
        if (!this.validateInstanceName(account.instanceName, tenantId)) {
          // Instancia no pertenece a este tenant, saltar
          continue;
        }

        // Buscar instancia en Evolution API
        const evolutionInstance = evolutionIndex.get(account.instanceName);

        if (!evolutionInstance) {
          // Instancia eliminada externamente
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: $Enums.tenantwhatsappaccount_status.ERROR,
              // @ts-ignore - Prisma Client regenerado
              statusReason: 'EXTERNAL_DELETED',
              lastCheckedAt: new Date(),
              // @ts-ignore - Prisma Client regenerado
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
          orphaned++;
          continue;
        }

        // Actualizar estado según Evolution API
        const newStatus = this.mapEvolutionStatusToAccountStatus(evolutionInstance.status);
        const newPhoneNumber = evolutionInstance.phoneNumber || null; // No guardar '' vacío

        if (account.status !== newStatus || account.phoneNumber !== newPhoneNumber) {
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: newStatus,
              phoneNumber: newPhoneNumber,
              // @ts-ignore - Prisma Client regenerado
        statusReason: null, // Limpiar statusReason si se recupera
              lastCheckedAt: new Date(),
              // @ts-ignore - Prisma Client regenerado
              lastSyncedAt: new Date(),
              connectedAt:
                newStatus === $Enums.tenantwhatsappaccount_status.CONNECTED
                  ? account.connectedAt || new Date()
                  : account.connectedAt,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          // Actualizar lastSyncedAt aunque no haya cambios
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              // @ts-ignore - Prisma Client regenerado
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        synced++;
      } catch (error: any) {
        errors.push({
          instanceName: account.instanceName || 'unknown',
          error: error.message,
        });
      }
    }

    // IMPORTAR instancias externas: si instanceName startsWith tenant-{tenantId}- y no existe en BD
    for (const evolutionInstance of evolutionInstances) {
      const instanceName = evolutionInstance.instanceName;
      if (!instanceName || !instanceName.startsWith(`tenant-${tenantId}-`)) {
        continue; // No pertenece a este tenant
      }

      // Verificar si ya existe en BD
      const existingAccount = accounts.find(acc => acc.instanceName === instanceName);
      if (existingAccount) {
        continue; // Ya existe, ya se procesó arriba
      }

      // Crear nueva cuenta para instancia externa
      try {
        const newStatus = this.mapEvolutionStatusToAccountStatus(evolutionInstance.status);
        await this.prisma.tenantwhatsappaccount.create({
          data: createData({
            tenantId,
            provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
            phoneNumber: evolutionInstance.phoneNumber || null, // No guardar '' vacío
            status: newStatus,
            credentials: '{}', // Guardar '{}' en lugar de '' (no-nullable)
            instanceName,
            // @ts-ignore - Prisma Client regenerado
            connectionId: connection.id,
            connectedAt: newStatus === $Enums.tenantwhatsappaccount_status.CONNECTED ? new Date() : null,
            lastCheckedAt: new Date(),
            // @ts-ignore - Prisma Client regenerado
            lastSyncedAt: new Date(),
          }),
        });
        synced++;
        updated++; // Contar como actualización
      } catch (error: any) {
        errors.push({
          instanceName,
          error: `Failed to import external instance: ${error.message}`,
        });
      }
    }

    return {
      success: true,
      data: {
        synced,
        updated,
        orphaned,
        errors,
      },
    };
  }

  /**
   * Mapea estado de Evolution API a estado de cuenta
   */
  private mapEvolutionStatusToAccountStatus(
    evolutionStatus: 'open' | 'close' | 'connecting',
  ): $Enums.tenantwhatsappaccount_status {
    switch (evolutionStatus) {
      case 'open':
        return $Enums.tenantwhatsappaccount_status.CONNECTED;
      case 'close':
        return $Enums.tenantwhatsappaccount_status.DISCONNECTED;
      case 'connecting':
        return $Enums.tenantwhatsappaccount_status.PENDING;
      default:
        return $Enums.tenantwhatsappaccount_status.ERROR;
    }
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

