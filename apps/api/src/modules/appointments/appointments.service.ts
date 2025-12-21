import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { createData } from '../../common/prisma/create-data.helper';
import { WhatsAppMessagingService } from '../whatsapp/whatsapp-messaging.service';
import { N8nEventService } from '../n8n-integration/services/n8n-event.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { $Enums } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
    private whatsappMessagingService: WhatsAppMessagingService,
    private n8nEventService: N8nEventService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Crea una nueva cita
   */
  async createAppointment(tenantId: string, dto: CreateAppointmentDto) {
    // Validar que el agente existe y pertenece al tenant
        const agent = await this.prisma.agent.findFirst({
      where: {
        id: dto.agentId,
        tenantId,
      },
      include: {
        agentcalendarrule: {
          include: {
            calendarintegration: true,
          },
          take: 1,
        },
      },
    });

    if (!agent) {
      throw new NotFoundException({
        success: false,
        error_key: 'appointments.agent_not_found',
        message: 'Agent not found or does not belong to tenant',
      });
    }

    // Validar que la conversación existe y pertenece al tenant
        const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: dto.conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'appointments.conversation_not_found',
        message: 'Conversation not found or does not belong to tenant',
      });
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // Validar que startTime < endTime
    if (startTime >= endTime) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.invalid_time_range',
        message: 'Start time must be before end time',
      });
    }

    // Validar disponibilidad usando CalendarService
    if (agent.agentcalendarrule.length > 0) {
      const rule = agent.agentcalendarrule[0];
      const availability = await this.calendarService.getAvailability(tenantId, {
        agentId: dto.agentId,
        calendarIntegrationId: rule.calendarIntegrationId,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
      });

      // Verificar que el slot está disponible
      const isAvailable = availability.data.slots?.some(
        (slot: { start: Date; end: Date }) =>
          new Date(slot.start).getTime() === startTime.getTime() &&
          new Date(slot.end).getTime() === endTime.getTime(),
      );

      if (!isAvailable) {
        throw new BadRequestException({
          success: false,
          error_key: 'appointments.slot_not_available',
          message: 'The selected time slot is not available',
        });
      }
    }

    // Crear evento en calendario externo si hay integración
    let calendarEventId: string | null = null;
    if (agent.agentcalendarrule.length > 0) {
      try {
        const rule = agent.agentcalendarrule[0];
        // Obtener integración de calendario
                const integration = await this.prisma.calendarintegration.findFirst({
          where: {
            id: rule.calendarIntegrationId,
            tenantId,
            status: 'ACTIVE',
          },
        });

        if (integration) {
          // Crear evento en calendario externo usando CalendarService
          const eventTitle = `Cita con ${dto.participantName || dto.participantPhone}`;
          const eventDescription = dto.notes || '';
          
          const calendarEvent = await this.calendarService.createEvent(
            tenantId,
            rule.calendarIntegrationId,
            {
              title: eventTitle,
              start: startTime,
              end: endTime,
              description: eventDescription,
              attendeeName: dto.participantName,
              attendeeEmail: undefined, // No tenemos email del participante en WhatsApp
            },
          );

          calendarEventId = calendarEvent.data.id;
          this.logger.log(`Calendar event created: ${calendarEventId}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continuamos sin calendarEventId - la cita se guarda igual
      }
    }

    // Crear la cita en la base de datos
        const appointment = await this.prisma.appointment.create({
      data: createData({
        tenantId,
        agentId: dto.agentId,
        conversationId: dto.conversationId,
        calendarEventId,
        participantPhone: dto.participantPhone,
        participantName: dto.participantName,
        startTime,
        endTime,
        status: $Enums.appointment_status.PENDING,
        notes: dto.notes,
      }),
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
          },
        },
      },
    });

    // Enviar confirmación vía WhatsApp
    try {
      // CRÍTICO: Validar que la conversación pertenece al tenant antes de acceder
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: dto.conversationId,
          tenantId, // OBLIGATORIO - Previene acceso cross-tenant
        },
        select: { whatsappAccountId: true },
      });

      if (conversation) {
        await this.sendAppointmentConfirmation(appointment, conversation.whatsappAccountId);
      }
    } catch (error) {
      this.logger.warn(`Failed to send WhatsApp confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Emitir evento de cita confirmada a n8n
    try {
      await this.n8nEventService.emitBookingConfirmed(tenantId, {
        appointmentId: appointment.id,
        agentId: appointment.agentId,
        participantPhone: appointment.participantPhone,
        participantName: appointment.participantName,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        status: appointment.status,
      });
    } catch (error) {
      this.logger.warn(`Failed to emit booking_confirmed event to n8n: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Notificar a usuarios del tenant sobre nueva cita
    try {
      // Obtener usuarios OWNER, ADMIN y AGENT asignado
      const memberships = await this.prisma.tenantmembership.findMany({
        where: {
          tenantId,
          role: { in: ['OWNER', 'ADMIN', 'AGENT'] },
        },
        select: { userId: true },
      });

      // Obtener agente para notificar al usuario asignado
      const agent = await this.prisma.agent.findUnique({
        where: { id: appointment.agentId },
        select: { id: true },
      });

      // OPTIMIZACIÓN: Usar Promise.all para evitar N+1 queries
      // Antes: queries secuenciales (10 miembros = 10 queries = ~500ms)
      // Después: queries paralelas (10 miembros = 1 query paralela = ~50ms)
      await Promise.all(
        memberships.map((membership) =>
          this.notificationsService.createNotification(
            tenantId,
            membership.userId,
            $Enums.notification_type.APPOINTMENT_CREATED,
            'notifications.appointment.created',
            'notifications.appointment.created_description',
            `/app/appointments/${appointment.id}`,
            {
              appointmentId: appointment.id,
              agentId: appointment.agentId,
              participantName: appointment.participantName || appointment.participantPhone,
              participantPhone: appointment.participantPhone,
              startTime: appointment.startTime.toISOString(),
              endTime: appointment.endTime.toISOString(),
            },
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to send appointment notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      data: appointment,
    };
  }

  /**
   * Lista citas con filtros
   */
  async getAppointments(tenantId: string, filters: ListAppointmentsDto) {
    const where: {
      tenantId: string;
      agentId?: string;
      conversationId?: string;
      participantPhone?: string;
      status?: $Enums.appointment_status;
      startTime?: { gte?: Date; lte?: Date };
    } = {
      tenantId,
    };

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters.conversationId) {
      where.conversationId = filters.conversationId;
    }

    if (filters.participantPhone) {
      where.participantPhone = filters.participantPhone;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startTime.lte = new Date(filters.endDate);
      }
    }

        const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return {
      success: true,
      data: appointments,
    };
  }

  /**
   * Obtiene una cita por ID
   */
  async getAppointmentById(tenantId: string, appointmentId: string) {
        const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException({
        success: false,
        error_key: 'appointments.not_found',
        message: 'Appointment not found',
      });
    }

    return {
      success: true,
      data: appointment,
    };
  }

  /**
   * Reprograma una cita
   */
  async rescheduleAppointment(
    tenantId: string,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ) {
        const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
      include: {
        agent: {
          include: {
            agentcalendarrule: {
              include: {
                calendarintegration: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException({
        success: false,
        error_key: 'appointments.not_found',
        message: 'Appointment not found',
      });
    }

    if (appointment.status === $Enums.appointment_status.CANCELLED) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.already_cancelled',
        message: 'Cannot reschedule a cancelled appointment',
      });
    }

    if (appointment.status === $Enums.appointment_status.COMPLETED) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.already_completed',
        message: 'Cannot reschedule a completed appointment',
      });
    }

    const newStartTime = new Date(dto.newStartTime);
    const newEndTime = new Date(dto.newEndTime);

    if (newStartTime >= newEndTime) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.invalid_time_range',
        message: 'Start time must be before end time',
      });
    }

    // Validar disponibilidad del nuevo slot
    if (appointment.agent.agentcalendarrule.length > 0) {
      const rule = appointment.agent.agentcalendarrule[0];
      const availability = await this.calendarService.getAvailability(tenantId, {
        agentId: appointment.agentId,
        calendarIntegrationId: rule.calendarIntegrationId,
        startDate: newStartTime.toISOString(),
        endDate: newEndTime.toISOString(),
      });

      const isAvailable = availability.data.slots?.some(
        (slot: { start: Date; end: Date }) =>
          new Date(slot.start).getTime() === newStartTime.getTime() &&
          new Date(slot.end).getTime() === newEndTime.getTime(),
      );

      if (!isAvailable) {
        throw new BadRequestException({
          success: false,
          error_key: 'appointments.slot_not_available',
          message: 'The selected time slot is not available',
        });
      }
    }

    // Actualizar evento en calendario externo si existe
    // Para reprogramar, cancelamos el evento anterior y creamos uno nuevo
    let newCalendarEventId: string | null = appointment.calendarEventId;
    if (appointment.calendarEventId && appointment.agent.agentcalendarrule.length > 0) {
      try {
        const rule = appointment.agent.agentcalendarrule[0];
        // Cancelar evento anterior
        await this.calendarService.cancelEvent(
          tenantId,
          rule.calendarIntegrationId,
          appointment.calendarEventId,
        );
        // Crear nuevo evento con los nuevos horarios
        const eventTitle = `Cita con ${appointment.participantName || appointment.participantPhone}`;
        const eventDescription = appointment.notes || '';
        const calendarEvent = await this.calendarService.createEvent(
          tenantId,
          rule.calendarIntegrationId,
          {
            title: eventTitle,
            start: newStartTime,
            end: newEndTime,
            description: eventDescription,
            attendeeName: appointment.participantName,
            attendeeEmail: undefined,
          },
        );
        newCalendarEventId = calendarEvent.data.id;
        this.logger.log(`Calendar event rescheduled: ${appointment.calendarEventId} -> ${newCalendarEventId}`);
      } catch (error) {
        this.logger.warn(`Failed to reschedule calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continuamos con la reprogramación en BD aunque falle en calendario
      }
    }

    // Actualizar la cita
        const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        calendarEventId: newCalendarEventId,
        notes: dto.notes ? `${appointment.notes || ''}\n${dto.notes}`.trim() : appointment.notes,
        status: $Enums.appointment_status.PENDING, // Resetear a PENDING al reprogramar
        reminderSent: false, // Resetear recordatorio
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
          },
        },
      },
    });

    // Enviar notificación de reprogramación
    try {
            const conversation = await this.prisma.conversation.findUnique({
        where: { id: appointment.conversationId },
        select: { whatsappAccountId: true },
      });

      if (conversation) {
        await this.sendRescheduleNotification(updated, conversation.whatsappAccountId);
      }
    } catch (error) {
      this.logger.warn(`Failed to send reschedule notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Notificar a usuarios del tenant sobre reprogramación
    try {
      const memberships = await this.prisma.tenantmembership.findMany({
        where: {
          tenantId,
          role: { in: ['OWNER', 'ADMIN', 'AGENT'] },
        },
        select: { userId: true },
      });

      for (const membership of memberships) {
        await this.notificationsService.createNotification(
          tenantId,
          membership.userId,
          $Enums.notification_type.APPOINTMENT_RESCHEDULED,
          'notifications.appointment.rescheduled',
          'notifications.appointment.rescheduled_description',
          `/app/appointments/${updated.id}`,
          {
            appointmentId: updated.id,
            participantName: updated.participantName || updated.participantPhone,
            participantPhone: updated.participantPhone,
            startTime: updated.startTime.toISOString(),
            endTime: updated.endTime.toISOString(),
          },
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send reschedule notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Cancela una cita
   */
  async cancelAppointment(
    tenantId: string,
    appointmentId: string,
    dto: CancelAppointmentDto,
  ) {
        const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
      include: {
        agent: {
          include: {
            agentcalendarrule: {
              include: {
                calendarintegration: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException({
        success: false,
        error_key: 'appointments.not_found',
        message: 'Appointment not found',
      });
    }

    if (appointment.status === $Enums.appointment_status.CANCELLED) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.already_cancelled',
        message: 'Appointment is already cancelled',
      });
    }

    // Cancelar evento en calendario externo si existe
    if (appointment.calendarEventId && appointment.agent.agentcalendarrule.length > 0) {
      try {
        const rule = appointment.agent.agentcalendarrule[0];
        await this.calendarService.cancelEvent(
          tenantId,
          rule.calendarIntegrationId,
          appointment.calendarEventId,
        );
        this.logger.log(`Calendar event cancelled: ${appointment.calendarEventId}`);
      } catch (error) {
        this.logger.warn(`Failed to cancel calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continuamos con la cancelación en BD aunque falle en calendario
      }
    }

    // Actualizar la cita
        const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: $Enums.appointment_status.CANCELLED,
        notes: dto.reason
          ? `${appointment.notes || ''}\nCancelled: ${dto.reason}`.trim()
          : appointment.notes,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
          },
        },
      },
    });

    // Enviar notificación de cancelación
    try {
            const conversation = await this.prisma.conversation.findUnique({
        where: { id: appointment.conversationId },
        select: { whatsappAccountId: true },
      });

      if (conversation) {
        await this.sendCancellationNotification(updated, conversation.whatsappAccountId);
      }
    } catch (error) {
      this.logger.warn(`Failed to send cancellation notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Notificar a usuarios del tenant sobre cancelación
    try {
      const memberships = await this.prisma.tenantmembership.findMany({
        where: {
          tenantId,
          role: { in: ['OWNER', 'ADMIN', 'AGENT'] },
        },
        select: { userId: true },
      });

      for (const membership of memberships) {
        await this.notificationsService.createNotification(
          tenantId,
          membership.userId,
          $Enums.notification_type.APPOINTMENT_CANCELLED,
          'notifications.appointment.cancelled',
          'notifications.appointment.cancelled_description',
          `/app/appointments/${updated.id}`,
          {
            appointmentId: updated.id,
            participantName: updated.participantName || updated.participantPhone,
            participantPhone: updated.participantPhone,
          },
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send cancellation notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Envía un recordatorio de cita
   */
  async sendReminder(tenantId: string, appointmentId: string) {
        const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
            whatsappAccountId: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException({
        success: false,
        error_key: 'appointments.not_found',
        message: 'Appointment not found',
      });
    }

    if (appointment.status !== $Enums.appointment_status.PENDING && appointment.status !== $Enums.appointment_status.CONFIRMED) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.invalid_status_for_reminder',
        message: 'Cannot send reminder for appointment with current status',
      });
    }

    // Enviar recordatorio vía WhatsApp
    try {
      const reminderMessage = this.buildReminderMessage(appointment);
      await this.whatsappMessagingService.sendMessage(
        tenantId,
        appointment.participantPhone,
        reminderMessage,
        appointment.conversation.whatsappAccountId,
      );

      // Marcar recordatorio como enviado
            await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { reminderSent: true },
      });

      return {
        success: true,
        data: { message: 'Reminder sent successfully' },
      };
    } catch (error) {
      this.logger.error(`Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.reminder_send_failed',
        message: 'Failed to send reminder',
      });
    }
  }

  /**
   * Obtiene las próximas citas
   */
  async getUpcomingAppointments(tenantId: string, limit: number = 10) {
    const now = new Date();

        const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: {
          gte: now,
        },
        status: {
          in: [$Enums.appointment_status.PENDING, $Enums.appointment_status.CONFIRMED],
        },
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: limit,
    });

    return {
      success: true,
      data: appointments,
    };
  }

  /**
   * Obtiene citas en un rango de fechas (para calendario)
   */
  async getAppointmentsByRange(
    tenantId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      agentId?: string;
    },
  ) {
    // Validar rango de fechas
    if (filters.startDate >= filters.endDate) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.invalid_date_range',
        message: 'startDate must be before endDate',
      });
    }

    // Limitar rango máximo a 3 meses
    const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 días en milisegundos
    const range = filters.endDate.getTime() - filters.startDate.getTime();
    if (range > maxRange) {
      throw new BadRequestException({
        success: false,
        error_key: 'appointments.range_too_large',
        message: 'Date range cannot exceed 90 days',
      });
    }

    const where: any = {
      tenantId,
      startTime: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            participantName: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return {
      success: true,
      data: appointments,
    };
  }

  /**
   * Envía confirmación de cita vía WhatsApp
   */
  private async sendAppointmentConfirmation(
    appointment: {
      id: string;
      participantPhone: string;
      participantName?: string | null;
      startTime: Date;
      endTime: Date;
      agent: { name: string };
      conversation: { id: string };
    },
    whatsappAccountId: string,
  ) {
        const conversation = await this.prisma.conversation.findUnique({
      where: { id: appointment.conversation.id },
      select: { tenantId: true },
    });

    if (conversation) {
      const message = `✅ Cita confirmada\n\n` +
        `📅 Fecha: ${new Date(appointment.startTime).toLocaleString('es-ES')}\n` +
        `⏰ Hora: ${new Date(appointment.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}\n` +
        `👤 Agente: ${appointment.agent.name}\n\n` +
        `Te recordaremos antes de la cita.`;

      await this.whatsappMessagingService.sendMessage(
        conversation.tenantId,
        appointment.participantPhone,
        message,
        whatsappAccountId,
      );
    }
  }

  /**
   * Envía notificación de reprogramación vía WhatsApp
   */
  private async sendRescheduleNotification(
    appointment: {
      id: string;
      participantPhone: string;
      participantName?: string | null;
      startTime: Date;
      endTime: Date;
      agent: { name: string };
      conversation: { id: string };
    },
    whatsappAccountId: string,
  ) {
        const conversation = await this.prisma.conversation.findUnique({
      where: { id: appointment.conversation.id },
      select: { tenantId: true },
    });

    if (conversation) {
      const message = `🔄 Tu cita ha sido reprogramada\n\n` +
        `📅 Nueva fecha: ${new Date(appointment.startTime).toLocaleString('es-ES')}\n` +
        `⏰ Nueva hora: ${new Date(appointment.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}\n` +
        `👤 Agente: ${appointment.agent.name}`;

      await this.whatsappMessagingService.sendMessage(
        conversation.tenantId,
        appointment.participantPhone,
        message,
        whatsappAccountId,
      );
    }
  }

  /**
   * Envía notificación de cancelación vía WhatsApp
   */
  private async sendCancellationNotification(
    appointment: {
      id: string;
      participantPhone: string;
      participantName?: string | null;
      agent: { name: string };
      conversation: { id: string };
    },
    whatsappAccountId: string,
  ) {
        const conversation = await this.prisma.conversation.findUnique({
      where: { id: appointment.conversation.id },
      select: { tenantId: true },
    });

    if (conversation) {
      const message = `❌ Tu cita ha sido cancelada\n\n` +
        `Si necesitas reagendar, por favor contáctanos.`;

      await this.whatsappMessagingService.sendMessage(
        conversation.tenantId,
        appointment.participantPhone,
        message,
        whatsappAccountId,
      );
    }
  }

  /**
   * Construye el mensaje de recordatorio
   */
  private buildReminderMessage(appointment: {
    startTime: Date;
    endTime: Date;
    agent: { name: string };
  }): string {
    const hoursUntil = Math.floor(
      (appointment.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60),
    );

    let message = `🔔 Recordatorio de cita\n\n`;
    message += `📅 Fecha: ${new Date(appointment.startTime).toLocaleString('es-ES')}\n`;
    message += `⏰ Hora: ${new Date(appointment.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}\n`;
    message += `👤 Agente: ${appointment.agent.name}\n\n`;

    if (hoursUntil < 24) {
      message += `Tu cita es en ${hoursUntil} hora(s). ¡Te esperamos!`;
    } else {
      message += `Tu cita es mañana. ¡Te esperamos!`;
    }

    return message;
  }
}

