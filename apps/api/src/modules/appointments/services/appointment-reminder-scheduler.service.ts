import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppointmentsService } from '../appointments.service';
import { $Enums } from '@prisma/client';

/**
 * Servicio que ejecuta periódicamente el envío automático de recordatorios de citas
 * Busca citas próximas y envía recordatorios según configuración
 */
@Injectable()
export class AppointmentReminderSchedulerService {
  private readonly logger = new Logger(AppointmentReminderSchedulerService.name);
  private readonly REMINDER_HOURS_BEFORE = 24; // Enviar recordatorio 24 horas antes por defecto

  constructor(
    private prisma: PrismaService,
    private appointmentsService: AppointmentsService,
  ) {}

  /**
   * Ejecuta envío de recordatorios cada hora
   * Busca citas que están próximas (dentro de las próximas 24 horas) y no han recibido recordatorio
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendScheduledReminders() {
    this.logger.log('🔄 Iniciando envío automático de recordatorios de citas...');

    try {
      const now = new Date();
      const reminderWindowStart = new Date(now.getTime() + (this.REMINDER_HOURS_BEFORE - 1) * 60 * 60 * 1000); // 23 horas desde ahora
      const reminderWindowEnd = new Date(now.getTime() + (this.REMINDER_HOURS_BEFORE + 1) * 60 * 60 * 1000); // 25 horas desde ahora

      // Buscar citas que:
      // 1. Están en estado PENDING o CONFIRMED
      // 2. Están dentro de la ventana de recordatorio (24 horas ± 1 hora)
      // 3. No han recibido recordatorio aún (reminderSent = false)
      const appointmentsToRemind = await this.prisma.appointment.findMany({
        where: {
          status: {
            in: [$Enums.appointment_status.PENDING, $Enums.appointment_status.CONFIRMED],
          },
          startTime: {
            gte: reminderWindowStart,
            lte: reminderWindowEnd,
          },
          reminderSent: false,
        },
        include: {
          tenant: {
            select: {
              id: true,
            },
          },
        },
      });

      this.logger.log(`📊 Encontradas ${appointmentsToRemind.length} citas para enviar recordatorio`);

      let successCount = 0;
      let errorCount = 0;

      // Enviar recordatorio para cada cita
      for (const appointment of appointmentsToRemind) {
        try {
          await this.appointmentsService.sendReminder(
            appointment.tenantId,
            appointment.id,
          );
          successCount++;
          this.logger.log(`✅ Recordatorio enviado para cita ${appointment.id}`);
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Error enviando recordatorio para cita ${appointment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Continuar con la siguiente cita aunque falle una
        }
      }

      this.logger.log(
        `✅ Proceso completado: ${successCount} recordatorios enviados, ${errorCount} errores`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error en proceso de recordatorios automáticos: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
