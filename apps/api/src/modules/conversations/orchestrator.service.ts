import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppMessagingService } from '../whatsapp/whatsapp-messaging.service';
import { AIOrchestratorService } from './services/ai-orchestrator.service';
import { AppointmentsService } from '../appointments/appointments.service';

/**
 * ConversationOrchestratorService
 * 
 * Orquestador base para procesar mensajes entrantes y decidir acciones.
 * Intenta usar IA primero, con fallback a respuestas básicas predefinidas.
 */
@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private messagingService: WhatsAppMessagingService,
    private aiOrchestrator: AIOrchestratorService,
    @Inject(forwardRef(() => AppointmentsService))
    private appointmentsService: AppointmentsService,
  ) {}

  /**
   * Procesa un mensaje entrante y decide qué acción tomar
   */
  async processIncomingMessage(data: {
    conversationId: string;
    messageId: string;
    tenantId: string;
    whatsappAccountId: string;
    participantPhone: string;
    content: string;
  }) {
    this.logger.log(
      `Processing incoming message ${data.messageId} in conversation ${data.conversationId}`,
    );

    try {
      // Intentar usar IA primero
      let response: string | null = null;
      let useAI = true;

      try {
        // Obtener agentId de la conversación si existe
                const conversation = await this.prisma.conversation.findUnique({
          where: { id: data.conversationId },
          select: { agentId: true },
        });

        const aiResponse = await this.aiOrchestrator.processMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
          tenantId: data.tenantId,
          whatsappAccountId: data.whatsappAccountId,
          participantPhone: data.participantPhone,
          content: data.content,
          agentId: conversation?.agentId || undefined,
        });

        response = aiResponse.content;
        this.logger.log(`AI response generated (intent: ${aiResponse.intent}, confidence: ${aiResponse.confidence})`);

        // Si requiere acción, procesarla
        if (aiResponse.requiresAction) {
          this.logger.log(`Action required: ${aiResponse.actionType} for conversation ${data.conversationId}`);
          await this.handleAction(aiResponse, data);
        }
      } catch (aiError) {
        this.logger.warn(`AI processing failed, falling back to basic response: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
        useAI = false;
      }

      // Fallback a respuesta básica si IA falla
      if (!response) {
        response = await this.generateBasicResponse(data);
      }

      if (response) {
        // Enviar respuesta
        await this.messagingService.sendMessage(
          data.tenantId,
          data.participantPhone,
          response,
          data.whatsappAccountId,
        );

        this.logger.log(`Response sent to ${data.participantPhone} (${useAI ? 'AI' : 'basic'})`);
      } else {
        this.logger.debug(`No response generated for message ${data.messageId}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing message: ${errorMessage}`);
      // No lanzar error para no bloquear el webhook
    }
  }

  /**
   * Genera una respuesta básica predefinida
   * 
   * Por ahora solo responde a saludos básicos.
   * En el futuro esto se reemplazará con IA.
   */
  private async generateBasicResponse(data: {
    content: string;
    tenantId: string;
  }): Promise<string | null> {
    const content = data.content.toLowerCase().trim();

    // Respuestas básicas predefinidas
    const greetings = ['hola', 'hi', 'hello', 'buenos días', 'buenas tardes', 'buenas noches'];
    const farewells = ['adiós', 'bye', 'hasta luego', 'nos vemos'];

    if (greetings.some((greeting) => content.includes(greeting))) {
      // Obtener nombre del tenant para personalizar respuesta
            const tenant = await this.prisma.tenant.findUnique({
        where: { id: data.tenantId },
      });

      const tenantName = tenant?.name || 'nosotros';
      return `¡Hola! Gracias por contactar a ${tenantName}. ¿En qué puedo ayudarte?`;
    }

    if (farewells.some((farewell) => content.includes(farewell))) {
      return '¡Hasta luego! Que tengas un buen día.';
    }

    // Por ahora, no responder a otros mensajes
    // En el futuro, aquí se integrará con IA
    return null;
  }

  /**
   * Obtiene el agente asociado a una conversación
   * 
   * Por ahora retorna null ya que los agentes aún no están implementados.
   * En el futuro, aquí se resolverá el agente desde la conversación.
   */
  async resolveAgent(conversationId: string): Promise<string | null> {
        const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { agentId: true },
    });

    return conversation?.agentId || null;
  }

  /**
   * Maneja acciones requeridas por la IA (agendar, cancelar, reprogramar citas)
   */
  private async handleAction(
    aiResponse: {
      actionType?: string;
      entities?: Record<string, string>;
      content: string;
    },
    data: {
      conversationId: string;
      tenantId: string;
      participantPhone: string;
    },
  ) {
    if (!aiResponse.actionType || !aiResponse.entities) {
      return;
    }

    try {
            const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        select: { agentId: true },
      });

      if (!conversation?.agentId) {
        this.logger.warn(`No agent found for conversation ${data.conversationId}`);
        return;
      }

      switch (aiResponse.actionType) {
        case 'SCHEDULE':
        case 'SCHEDULE_APPOINTMENT':
          // Extraer fecha y hora de las entidades
          const dateStr = aiResponse.entities.date || aiResponse.entities.datetime;
          const timeStr = aiResponse.entities.time || aiResponse.entities.datetime;

          if (dateStr) {
            // Intentar parsear fecha y hora
            const startTime = this.parseDateTime(dateStr, timeStr);
            const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutos por defecto

            if (startTime && startTime > new Date()) {
              await this.appointmentsService.createAppointment(data.tenantId, {
                agentId: conversation.agentId,
                conversationId: data.conversationId,
                participantPhone: data.participantPhone,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              });
              this.logger.log(`Appointment created for conversation ${data.conversationId}`);
            }
          }
          break;

        case 'CANCEL':
        case 'CANCEL_APPOINTMENT':
          // Buscar cita pendiente o confirmada para esta conversación
          const appointments = await this.appointmentsService.getAppointments(data.tenantId, {
            conversationId: data.conversationId,
            status: 'PENDING' as any,
          });

          if (appointments.data && Array.isArray(appointments.data) && appointments.data.length > 0) {
            const appointment = appointments.data[0];
            await this.appointmentsService.cancelAppointment(data.tenantId, appointment.id, {
              reason: 'Cancelled by user via chat',
            });
            this.logger.log(`Appointment ${appointment.id} cancelled`);
          }
          break;

        case 'RESCHEDULE':
        case 'RESCHEDULE_APPOINTMENT':
          // Buscar cita pendiente o confirmada
          const rescheduleAppointments = await this.appointmentsService.getAppointments(data.tenantId, {
            conversationId: data.conversationId,
            status: 'PENDING' as any,
          });

          if (rescheduleAppointments.data && Array.isArray(rescheduleAppointments.data) && rescheduleAppointments.data.length > 0) {
            const appointment = rescheduleAppointments.data[0];
            const newDateStr = aiResponse.entities.date || aiResponse.entities.datetime;
            const newTimeStr = aiResponse.entities.time || aiResponse.entities.datetime;

            if (newDateStr) {
              const newStartTime = this.parseDateTime(newDateStr, newTimeStr);
              const newEndTime = new Date(newStartTime.getTime() + 30 * 60000);

              if (newStartTime && newStartTime > new Date()) {
                await this.appointmentsService.rescheduleAppointment(data.tenantId, appointment.id, {
                  newStartTime: newStartTime.toISOString(),
                  newEndTime: newEndTime.toISOString(),
                });
                this.logger.log(`Appointment ${appointment.id} rescheduled`);
              }
            }
          }
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling action ${aiResponse.actionType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parsea fecha y hora desde strings
   */
  private parseDateTime(dateStr: string, timeStr?: string): Date {
    try {
      // Intentar parsear como ISO string primero
      if (dateStr.includes('T') || dateStr.includes(' ')) {
        return new Date(dateStr);
      }

      // Si hay timeStr separado, combinarlos
      if (timeStr) {
        return new Date(`${dateStr}T${timeStr}`);
      }

      // Intentar parsear solo fecha
      return new Date(dateStr);
    } catch {
      // Si falla, retornar fecha actual + 1 día como fallback
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // 10:00 AM por defecto
      return tomorrow;
    }
  }
}

