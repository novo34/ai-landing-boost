import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationOrchestratorService } from '../conversations/orchestrator.service';
import { DocumentProcessorService } from '../knowledge-base/services/document-processor.service';
import { $Enums } from '@prisma/client';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class WebchatService {
  private readonly logger = new Logger(WebchatService.name);

  constructor(
    private prisma: PrismaService,
    private orchestrator: ConversationOrchestratorService,
    private documentProcessor: DocumentProcessorService,
  ) {}

  /**
   * Obtiene la configuración del widget para un tenant
   */
  async getWidgetConfig(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    
    if (!tenant) {
      throw new NotFoundException({
        success: false,
        error_key: 'webchat.tenant_not_found',
        message: 'Tenant not found',
      });
    }
    
    const settings = await this.prisma.tenantsettings.findUnique({
      where: { tenantId: tenant.id },
    });

    // Obtener canal WEBCHAT para este tenant
    const webchatChannel = await this.prisma.channel.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'WEBCHAT',
        status: 'ACTIVE',
      },
    });

    // Configuración por defecto
    const defaultConfig = {
      primaryColor: '#007bff',
      position: 'bottom-right',
      welcomeMessage: '¡Hola! ¿En qué puedo ayudarte?',
      placeholder: 'Escribe tu mensaje...',
    };

    // Si hay canal configurado, usar su configuración
    const channelConfig = webchatChannel?.config as {
      primaryColor?: string;
      position?: string;
      welcomeMessage?: string;
      placeholder?: string;
    } | null;

    // Obtener branding del tenant
    const branding = {
      logoUrl: settings?.logoUrl || null,
      primaryColor: settings?.primaryColor || null,
      secondaryColor: settings?.secondaryColor || null,
    };

    // Construir URL absoluta del logo si existe
    let absoluteLogoUrl: string | null = null;
    if (branding.logoUrl) {
      const apiUrl = process.env.API_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
      absoluteLogoUrl = branding.logoUrl.startsWith('http')
        ? branding.logoUrl
        : `${apiUrl}${branding.logoUrl}`;
    }

    return {
      success: true,
      data: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        config: {
          ...defaultConfig,
          ...(channelConfig || {}),
        },
        branding: {
          logoUrl: absoluteLogoUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
        },
      },
    };
  }

  /**
   * Crea o obtiene una conversación de webchat
   */
  async findOrCreateWebchatConversation(
    tenantId: string,
    participantId: string,
    participantName?: string,
  ) {
    // Buscar canal WEBCHAT activo
        const webchatChannel = await this.prisma.channel.findFirst({
      where: {
        tenantId,
        type: 'WEBCHAT',
        status: 'ACTIVE',
      },
    });

    if (!webchatChannel) {
      throw new BadRequestException({
        success: false,
        error_key: 'webchat.channel_not_configured',
        message: 'Webchat channel not configured for this tenant',
      });
    }

    // Buscar conversación existente usando metadata
        let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        metadata: {
          contains: 'WEBCHAT',
        },
      },
    });

    // Si no existe, crear una nueva
    // Nota: Conversation requiere whatsappAccountId, pero para webchat usamos un valor dummy
    // En el futuro, esto debería ser opcional o usar un modelo diferente
    if (!conversation) {
      // Obtener cualquier cuenta WhatsApp del tenant como placeholder
            const placeholderAccount = await this.prisma.tenantwhatsappaccount.findFirst({
        where: { tenantId },
      });

      if (!placeholderAccount) {
        throw new BadRequestException({
          success: false,
          error_key: 'webchat.no_account_configured',
          message: 'No WhatsApp account configured. Webchat requires at least one account.',
        });
      }

      conversation = await this.prisma.conversation.create({
        data: createData({
          tenantId,
          whatsappAccountId: placeholderAccount.id, // Placeholder hasta que Conversation soporte canales
          participantPhone: `webchat-${participantId}`, // ID único para webchat
          participantName: participantName || 'Usuario Web',
          status: $Enums.conversation_status.ACTIVE,
          metadata: JSON.stringify({
            channel: 'WEBCHAT',
            participantId,
            channelId: webchatChannel.id,
          }),
        }),
      });
    }

    return conversation;
  }

  /**
   * Envía un mensaje desde el widget
   */
  async sendMessage(
    tenantSlug: string,
    content: string,
    conversationId?: string,
    participantId?: string,
    participantName?: string,
  ) {
    // Obtener tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException({
        success: false,
        error_key: 'webchat.tenant_not_found',
        message: 'Tenant not found',
      });
    }

    // Generar participantId si no se proporciona
    const finalParticipantId = participantId || `webchat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Buscar o crear conversación
    let conversation;
    if (conversationId) {
      conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.tenantId !== tenant.id) {
        throw new NotFoundException({
          success: false,
          error_key: 'webchat.conversation_not_found',
          message: 'Conversation not found',
        });
      }
    } else {
      conversation = await this.findOrCreateWebchatConversation(
        tenant.id,
        finalParticipantId,
        participantName,
      );
    }

    // Detectar idioma
    const detectedLanguage = this.documentProcessor.detectLanguage(content);

    // Guardar mensaje
    const message = await this.prisma.message.create({
      data: createData({
        conversationId: conversation.id,
        tenantId: tenant.id,
        type: $Enums.message_type.TEXT,
        direction: $Enums.message_direction.INBOUND,
        content,
        language: detectedLanguage,
        status: $Enums.message_status.DELIVERED,
        sentAt: new Date(),
      }),
    });

    // Actualizar conversación
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        detectedLanguage: detectedLanguage,
      },
    });

    // Procesar mensaje con orquestador (async, no bloquear)
    // Nota: El orquestador espera whatsappAccountId, pero podemos pasar el de la conversación
    this.orchestrator
      .processIncomingMessage({
        conversationId: conversation.id,
        messageId: message.id,
        tenantId: tenant.id,
        whatsappAccountId: conversation.tenantwhatsappaccountId,
        participantPhone: conversation.participantPhone,
        content,
      })
      .catch((error) => {
        this.logger.error(`Error processing webchat message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });

    return {
      success: true,
      data: {
        messageId: message.id,
        conversationId: conversation.id,
        participantId: finalParticipantId,
      },
    };
  }

  /**
   * Obtiene el historial de mensajes de una conversación
   */
  async getMessages(conversationId: string, tenantSlug: string) {
    // Verificar tenant
        const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException({
        success: false,
        error_key: 'webchat.tenant_not_found',
        message: 'Tenant not found',
      });
    }

    // Obtener conversación
        const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.tenantId !== tenant.id) {
      throw new NotFoundException({
        success: false,
        error_key: 'webchat.conversation_not_found',
        message: 'Conversation not found',
      });
    }

    // Obtener mensajes
        const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
      take: 100,
    });

    return {
      success: true,
      data: {
        conversationId,
        message: messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          direction: msg.direction,
          status: msg.status,
          sentAt: msg.sentAt,
          language: msg.language,
        })),
      },
    };
  }
}

