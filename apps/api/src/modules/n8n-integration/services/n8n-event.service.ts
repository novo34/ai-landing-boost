import { Injectable, Logger } from '@nestjs/common';
import { N8nWebhookService } from './n8n-webhook.service';
import { N8nFlowsService } from '../n8n-flows.service';
import { $Enums } from '@prisma/client';

/**
 * Servicio para emitir eventos del sistema a n8n
 * 
 * Este servicio consulta los flujos n8n activos configurados para cada tipo de evento
 * y dispara los webhooks correspondientes.
 * 
 * Eventos soportados:
 * - new_lead: Nuevo lead de marketing
 * - new_conversation: Nueva conversación iniciada
 * - booking_confirmed: Cita confirmada
 * - payment_failed: Pago fallido
 * - trial_expiring: Trial por expirar
 */
@Injectable()
export class N8nEventService {
  private readonly logger = new Logger(N8nEventService.name);

  // Mapeo de eventos del sistema a tipos de flujo n8n
  private readonly eventTypeMapping: Record<string, $Enums.n8nflow_type> = {
    new_lead: $Enums.n8nflow_type.LEAD_INTAKE,
    new_conversation: $Enums.n8nflow_type.LEAD_INTAKE,
    booking_confirmed: $Enums.n8nflow_type.BOOKING_FLOW,
    payment_failed: $Enums.n8nflow_type.PAYMENT_FAILED,
    trial_expiring: $Enums.n8nflow_type.FOLLOWUP,
  };

  constructor(
    private n8nWebhookService: N8nWebhookService,
    private n8nFlowsService: N8nFlowsService,
  ) {}

  /**
   * Emite un evento del sistema y dispara los webhooks n8n configurados
   * 
   * @param eventType - Tipo de evento (new_lead, new_conversation, booking_confirmed, payment_failed, trial_expiring)
   * @param tenantId - ID del tenant
   * @param payload - Datos del evento
   * @param agentId - ID del agente (opcional, para filtrar flujos específicos)
   * 
   * @example
   * ```typescript
   * await n8nEventService.emitEvent('new_lead', tenantId, {
   *   leadId: 'lead-123',
   *   email: 'user@example.com',
   *   name: 'John Doe'
   * });
   * ```
   */
  async emitEvent(
    eventType: string,
    tenantId: string,
    payload: Record<string, unknown> = {},
    agentId?: string,
  ): Promise<void> {
    // Verificar si n8n está configurado
    if (!this.n8nWebhookService.isConfigured()) {
      this.logger.debug(`n8n not configured, skipping event ${eventType}`);
      return;
    }

    try {
      // Obtener el tipo de flujo correspondiente al evento
      const flowType = this.eventTypeMapping[eventType];
      
      if (!flowType) {
        this.logger.warn(`Unknown event type: ${eventType}. Skipping n8n webhook.`);
        return;
      }

      // Consultar flujos activos del tenant para este tipo de evento
      const flowsResponse = await this.n8nFlowsService.getFlows(tenantId, {
        type: flowType,
        isActive: true,
        agentId,
      });

      if (!flowsResponse.success || !flowsResponse.data || flowsResponse.data.length === 0) {
        this.logger.debug(`No active n8n flows found for event ${eventType} in tenant ${tenantId}`);
        return;
      }

      const activeFlows = flowsResponse.data;

      this.logger.log(
        `Emitting event ${eventType} to ${activeFlows.length} active n8n flow(s) for tenant ${tenantId}`,
      );

      // Disparar webhooks para todos los flujos activos en paralelo
      const webhookPromises = activeFlows.map((flow) =>
        this.n8nWebhookService.triggerWorkflow(
          flow.workflowId,
          eventType,
          {
            tenantId,
            agentId: flow.agentId,
            flowId: flow.id,
            flowName: flow.name,
            ...payload,
          },
        ),
      );

      const results = await Promise.allSettled(webhookPromises);
      
      // Log de resultados
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value).length;
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length;

      if (successful > 0) {
        this.logger.log(
          `Successfully triggered ${successful} webhook(s) for event ${eventType} in tenant ${tenantId}`,
        );
      }

      if (failed > 0) {
        this.logger.warn(
          `Failed to trigger ${failed} webhook(s) for event ${eventType} in tenant ${tenantId}`,
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // No lanzar error para no bloquear el flujo principal
      this.logger.error(
        `Error emitting event ${eventType} to n8n: ${errorMessage}`,
        { tenantId, eventType, error },
      );
    }
  }

  /**
   * Emite evento de nuevo lead
   */
  async emitNewLead(tenantId: string, leadData: {
    leadId: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('new_lead', tenantId, {
      leadId: leadData.leadId,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      company: leadData.company,
      source: leadData.source,
      ...leadData,
    });
  }

  /**
   * Emite evento de nueva conversación
   */
  async emitNewConversation(tenantId: string, conversationData: {
    conversationId: string;
    participantPhone: string;
    participantName?: string;
    agentId?: string;
    whatsappAccountId?: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent(
      'new_conversation',
      tenantId,
      {
        conversationId: conversationData.conversationId,
        participantPhone: conversationData.participantPhone,
        participantName: conversationData.participantName,
        agentId: conversationData.agentId,
        whatsappAccountId: conversationData.tenantwhatsappaccountId,
        ...conversationData,
      },
      conversationData.agentId,
    );
  }

  /**
   * Emite evento de cita confirmada
   */
  async emitBookingConfirmed(tenantId: string, appointmentData: {
    appointmentId: string;
    agentId?: string;
    participantPhone: string;
    participantName?: string;
    startTime: string;
    endTime: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent(
      'booking_confirmed',
      tenantId,
      {
        appointmentId: appointmentData.appointmentId,
        agentId: appointmentData.agentId,
        participantPhone: appointmentData.participantPhone,
        participantName: appointmentData.participantName,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        ...appointmentData,
      },
      appointmentData.agentId,
    );
  }

  /**
   * Emite evento de pago fallido
   */
  async emitPaymentFailed(tenantId: string, paymentData: {
    subscriptionId: string;
    invoiceId?: string;
    amount?: number;
    currency?: string;
    gracePeriodEndsAt?: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('payment_failed', tenantId, {
      subscriptionId: paymentData.subscriptionId,
      invoiceId: paymentData.invoiceId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      gracePeriodEndsAt: paymentData.gracePeriodEndsAt,
      ...paymentData,
    });
  }

  /**
   * Emite evento de trial por expirar
   */
  async emitTrialExpiring(tenantId: string, trialData: {
    subscriptionId: string;
    trialEndsAt: string;
    daysRemaining: number;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('trial_expiring', tenantId, {
      subscriptionId: trialData.subscriptionId,
      trialEndsAt: trialData.trialEndsAt,
      daysRemaining: trialData.daysRemaining,
      ...trialData,
    });
  }

  /**
   * Emite evento de usuario registrado
   */
  async emitUserRegistered(tenantId: string, userData: {
    userId: string;
    email: string;
    name?: string;
    method: 'email' | 'google' | 'microsoft';
    [key: string]: unknown;
  }): Promise<void> {
    // Usar emitEvent directamente ya que no hay tipo de flujo específico para este evento
    // Se puede usar FOLLOWUP o LEAD_INTAKE según configuración
    await this.emitEvent('user_registered', tenantId, {
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
      method: userData.method,
      ...userData,
    });
  }

  /**
   * Emite evento de email verificado
   */
  async emitEmailVerified(tenantId: string, userData: {
    userId: string;
    email: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('user_email_verified', tenantId, {
      userId: userData.userId,
      email: userData.email,
      ...userData,
    });
  }

  /**
   * Emite evento de SSO vinculado
   */
  async emitSSOLinked(tenantId: string, ssoData: {
    userId: string;
    email: string;
    provider: 'GOOGLE' | 'MICROSOFT';
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('user_sso_linked', tenantId, {
      userId: ssoData.userId,
      email: ssoData.email,
      provider: ssoData.provider,
      ...ssoData,
    });
  }

  /**
   * Emite evento de invitación enviada
   */
  async emitInvitationSent(tenantId: string, invitationData: {
    invitationId: string;
    email: string;
    role: string;
    inviterId: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('team_invitation_sent', tenantId, {
      invitationId: invitationData.invitationId,
      email: invitationData.email,
      role: invitationData.role,
      inviterId: invitationData.inviterId,
      ...invitationData,
    });
  }

  /**
   * Emite evento de invitación aceptada
   */
  async emitInvitationAccepted(tenantId: string, invitationData: {
    invitationId: string;
    email: string;
    userId: string;
    role: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('team_invitation_accepted', tenantId, {
      invitationId: invitationData.invitationId,
      email: invitationData.email,
      userId: invitationData.userId,
      role: invitationData.role,
      ...invitationData,
    });
  }

  /**
   * Emite evento de invitación rechazada
   */
  async emitInvitationRejected(tenantId: string, invitationData: {
    invitationId: string;
    email: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.emitEvent('team_invitation_rejected', tenantId, {
      invitationId: invitationData.invitationId,
      email: invitationData.email,
      ...invitationData,
    });
  }
}

