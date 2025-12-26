import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Servicio para limpiar refresh tokens expirados y revocados
 * Se ejecuta diariamente a las 2:00 AM
 */
@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Limpia tokens expirados y revocados más antiguos de 30 días
   * Se ejecuta diariamente a las 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup() {
    this.logger.log('Iniciando limpieza de refresh tokens expirados y revocados...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Eliminar tokens expirados o revocados hace más de 30 días
      const result = await this.prisma.refreshtoken.deleteMany({
        where: {
          OR: [
            // Tokens expirados hace más de 30 días
            {
              expiresAt: {
                lt: thirtyDaysAgo,
              },
            },
            // Tokens revocados hace más de 30 días
            {
              revokedAt: {
                not: null,
                lt: thirtyDaysAgo,
              },
            },
          ],
        },
      });

      this.logger.log(
        `Limpieza completada: ${result.count} refresh tokens eliminados (expirados o revocados hace más de 30 días)`
      );
    } catch (error) {
      this.logger.error(`Error en limpieza de refresh tokens: ${error.message}`, error.stack);
    }
  }
}

