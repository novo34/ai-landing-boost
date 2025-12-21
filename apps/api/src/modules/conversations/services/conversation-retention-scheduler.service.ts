import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConversationMemoryService } from './conversation-memory.service';

/**
 * Servicio que ejecuta periódicamente la limpieza de conversaciones antiguas
 * según las políticas de retención configuradas por cada tenant
 */
@Injectable()
export class ConversationRetentionSchedulerService {
  private readonly logger = new Logger(ConversationRetentionSchedulerService.name);

  constructor(private memoryService: ConversationMemoryService) {}

  /**
   * Ejecuta limpieza de conversaciones antiguas diariamente a las 2:00 AM
   * Respetando las políticas de retención configuradas por cada tenant
   */
  @Cron('0 2 * * *') // 2:00 AM todos los días
  async cleanupOldConversationsDaily() {
    this.logger.log('🔄 Iniciando limpieza diaria de conversaciones antiguas...');

    try {
      const result = await this.memoryService.cleanupAllTenantsOldConversations();

      this.logger.log(
        `✅ Limpieza completada: ${result.totalDeleted} conversaciones eliminadas en ${result.tenantsProcessed} tenants`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error en limpieza diaria de conversaciones: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
