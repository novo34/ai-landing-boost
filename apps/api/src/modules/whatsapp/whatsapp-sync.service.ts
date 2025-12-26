import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionProvider } from './providers/evolution.provider';
import { CryptoService } from '../crypto/crypto.service';
import { EncryptedBlobV1 } from '../crypto/crypto.types';
import { $Enums } from '@prisma/client';

@Injectable()
export class WhatsAppSyncService {
  private readonly logger = new Logger(WhatsAppSyncService.name);

  constructor(
    private prisma: PrismaService,
    private evolutionProvider: EvolutionProvider,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Sincroniza todas las instancias de Evolution API (por tenant activo)
   */
  async syncAllTenants() {
    this.logger.debug('Starting sync of all Evolution API instances');

    // Obtener todas las conexiones Evolution activas
    // @ts-ignore - Prisma Client regenerado, tipos disponibles después de reiniciar TS server
    const connections = await this.prisma.tenantevolutionconnection.findMany({
      where: {
        status: 'CONNECTED',
      },
    });

    // Sincronizar cada tenant
    for (const connection of connections) {
      try {
        await this.syncTenantInstances(connection.tenantId, connection.id);
      } catch (error: any) {
        this.logger.error(`Failed to sync tenant ${connection.tenantId}: ${error.message}`);
      }
    }

    this.logger.debug('Sync completed');
  }

  /**
   * Sincroniza instancias de un tenant específico
   * IMPORTANTE: 1 fetchInstances por tenant → reconcile todas las instancias
   */
  private async syncTenantInstances(tenantId: string, connectionId: string) {
    // @ts-ignore - Prisma Client regenerado
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'CONNECTED') {
      return;
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
    try {
      evolutionInstances = await this.evolutionProvider.listAllInstances(
        normalizedUrl,
        credentials.apiKey,
      );
    } catch (error: any) {
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
      }
      this.logger.error(`Failed to fetch instances for tenant ${tenantId}: ${error.message}`);
      return;
    }

    // Indexar instancias de Evolution por nombre
    const evolutionIndex = new Map<string, typeof evolutionInstances[0]>();
    for (const inst of evolutionInstances) {
      evolutionIndex.set(inst.instanceName, inst);
    }

    // Reconciliar: actualizar estados en BD según Evolution API
    for (const account of accounts) {
      try {
        if (!account.instanceName) {
          continue;
        }

        // Validar que instanceName pertenece al tenant (prefijo)
        const prefix = `tenant-${tenantId}-`;
        if (!account.instanceName.startsWith(prefix)) {
          // Instancia no pertenece a este tenant, saltar
          continue;
        }

        // Buscar instancia en Evolution API
        const evolutionInstance = evolutionIndex.get(account.instanceName);

        if (!evolutionInstance) {
          // Instancia eliminada externamente
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            // @ts-ignore - Prisma Client regenerado, campos statusReason y lastSyncedAt disponibles después de migración
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
          continue;
        }

        // Actualizar estado
        const newStatus = this.mapEvolutionStatusToAccountStatus(evolutionInstance.status);

        const newPhoneNumber = evolutionInstance.phoneNumber || null; // No guardar '' vacío

        if (account.status !== newStatus || account.phoneNumber !== newPhoneNumber) {
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: newStatus,
              phoneNumber: newPhoneNumber,
              // @ts-ignore - Prisma Client regenerado (statusReason field)
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
      } catch (error: any) {
        this.logger.error(`Failed to sync account ${account.id}: ${error.message}`);
      }
    }
  }

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
}

