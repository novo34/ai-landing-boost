import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp.service';
import { $Enums } from '@prisma/client';

/**
 * Servicio que verifica periódicamente las conexiones de WhatsApp
 * y reconecta automáticamente las que están desconectadas
 */
@Injectable()
export class WhatsAppReconnectSchedulerService {
  private readonly logger = new Logger(WhatsAppReconnectSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
  ) {}

  /**
   * Verifica conexiones de WhatsApp cada hora
   * Reconecta automáticamente las que están DISCONNECTED
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAndReconnectWhatsAppAccounts() {
    this.logger.log('🔄 Iniciando verificación periódica de conexiones WhatsApp...');

    try {
      // Obtener todas las cuentas desconectadas
      const disconnectedAccounts = await this.prisma.tenantwhatsappaccount.findMany({
        where: {
          status: $Enums.tenantwhatsappaccount_status.DISCONNECTED,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`📊 Encontradas ${disconnectedAccounts.length} cuentas desconectadas`);

      // Intentar reconectar cada cuenta
      for (const account of disconnectedAccounts) {
        try {
          this.logger.log(`🔄 Intentando reconectar cuenta ${account.id} (${account.phoneNumber})...`);
          
          await this.whatsappService.reconnectAccount(account.tenantId, account.id);
          
          this.logger.log(`✅ Reconexión iniciada para cuenta ${account.id}`);
        } catch (error) {
          this.logger.warn(
            `⚠️ Error al reconectar cuenta ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log('✅ Verificación periódica de conexiones WhatsApp completada');
    } catch (error) {
      this.logger.error(
        `❌ Error en verificación periódica de conexiones WhatsApp: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Verifica conexiones cada 5 minutos (más frecuente)
   * Solo para cuentas que están en estado PENDING por más de 10 minutos
   */
  @Cron('*/5 * * * *') // Cada 5 minutos
  async checkPendingConnections() {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const pendingAccounts = await this.prisma.tenantwhatsappaccount.findMany({
        where: {
          status: $Enums.tenantwhatsappaccount_status.PENDING,
          lastCheckedAt: {
            lt: tenMinutesAgo,
          },
        },
      });

      if (pendingAccounts.length > 0) {
        this.logger.log(`🔄 Verificando ${pendingAccounts.length} cuentas en estado PENDING...`);

        for (const account of pendingAccounts) {
          try {
            await this.whatsappService.validateAccount(account.tenantId, account.id);
          } catch (error) {
            this.logger.debug(`Error validando cuenta ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error en verificación de conexiones pendientes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
