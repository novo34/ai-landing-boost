import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsAppSyncService } from '../whatsapp-sync.service';

@Injectable()
export class WhatsAppSyncScheduler {
  private readonly logger = new Logger(WhatsAppSyncScheduler.name);

  constructor(private syncService: WhatsAppSyncService) {}

  /**
   * Sincroniza instancias cada 5 minutos (activas)
   * Para instancias inactivas, se puede usar otro cron con intervalo mayor
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSync() {
    this.logger.debug('Running scheduled sync of Evolution API instances');
    try {
      await this.syncService.syncAllTenants();
    } catch (error: any) {
      this.logger.error(`Scheduled sync failed: ${error.message}`);
    }
  }
}
