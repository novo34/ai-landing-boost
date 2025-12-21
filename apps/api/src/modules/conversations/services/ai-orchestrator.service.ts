import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { ConversationMemoryService } from './conversation-memory.service';
import { SemanticSearchService } from '../../knowledge-base/services/semantic-search.service';
import { detectIntent, extractEntities, Intent } from '../utils/intent-detection.util';
import { DocumentProcessorService } from '../../knowledge-base/services/document-processor.service';

export interface IncomingMessage {
  conversationId: string;
  messageId: string;
  tenantId: string;
  whatsappAccountId: string;
  participantPhone: string;
  content: string;
  agentId?: string;
}

export interface AIResponse {
  content: string;
  intent: Intent;
  confidence: number;
  entities?: Record<string, string>;
  knowledgeUsed?: boolean;
  requiresAction?: boolean;
  actionType?: string;
}

@Injectable()
export class AIOrchestratorService {
  private readonly logger = new Logger(AIOrchestratorService.name);
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private memoryService: ConversationMemoryService,
    private semanticSearch: SemanticSearchService,
    private documentProcessor: DocumentProcessorService,
  ) {
    // Inicializar OpenAI si hay API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
      this.logger.log('OpenAI client initialized for AI orchestrator');
    } else {
      this.logger.warn('⚠️ OPENAI_API_KEY not configured. AI orchestrator will be disabled.');
    }
  }

  /**
   * Procesa un mensaje entrante usando IA
   */
  async processMessage(message: IncomingMessage): Promise<AIResponse> {
    if (!this.openai) {
      throw new BadRequestException({
        success: false,
        error_key: 'ai.openai_not_configured',
        message: 'OpenAI API key not configured. AI orchestrator is disabled.',
      });
    }

    try {
      // 1. Detectar idioma
      const language = this.detectLanguage(message.content);
      this.logger.log(`Detected language: ${language} for message ${message.messageId}`);

      // 2. Obtener contexto conversacional
      const context = await this.getConversationContext(
        message.conversationId,
        message.tenantId,
      );

      // 3. Detectar intención
      const intentResult = detectIntent(message.content, language);
      const entities = extractEntities(message.content, language);
      this.logger.log(`Detected intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);

      // 4. Buscar en base de conocimiento (RAG)
      let knowledgeContext = '';
      let knowledgeUsed = false;
      try {
        const searchResults = await this.searchKnowledgeBase(
          message.tenantId,
          message.content,
          language,
        );
        if (searchResults.results.length > 0) {
          knowledgeContext = searchResults.results
            .slice(0, 3)
            .map((r) => r.content)
            .join('\n\n');
          knowledgeUsed = true;
          this.logger.log(`Found ${searchResults.results.length} relevant knowledge chunks`);
        }
      } catch (error) {
        this.logger.warn(`Knowledge base search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 5. Obtener configuración del agente si existe
      let agentConfig = null;
      if (message.agentId) {
                const agent = await this.prisma.agent.findFirst({
          where: {
            id: message.agentId,
            tenantId: message.tenantId,
          },
          select: {
            name: true,
            personalitySettings: true,
            defaultLanguage: true,
          },
        });
        agentConfig = agent;
      }

      // 6. Generar respuesta con LLM
      const response = await this.generateResponse({
        message: message.content,
        context: context.context.map((m) => `${m.direction === 'INBOUND' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n'),
        summary: context.summary,
        knowledgeContext,
        intent: intentResult.intent,
        language,
        agentConfig,
      });

      // 7. Logging de decisión
      await this.logDecision({
        conversationId: message.conversationId,
        messageId: message.messageId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        knowledgeUsed,
        responseLength: response.length,
      });

      return {
        content: response,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        entities,
        knowledgeUsed,
        requiresAction: this.requiresAction(intentResult.intent),
        actionType: this.getActionType(intentResult.intent),
      };
    } catch (error) {
      this.logger.error(`Error processing message with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Detecta el idioma del mensaje
   */
  private detectLanguage(text: string): string {
    try {
      // Usar el método público detectLanguage del DocumentProcessorService
      const detected = this.documentProcessor.detectLanguage(text);
      return detected !== 'unknown' ? detected : 'es';
    } catch (error) {
      this.logger.warn(`Language detection failed, defaulting to 'es': ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 'es';
    }
  }

  /**
   * Obtiene el contexto de la conversación
   */
  private async getConversationContext(
    conversationId: string,
    tenantId: string,
  ): Promise<{ context: Array<{ content: string; direction: string; createdAt: Date }>; summary?: string }> {
    try {
      const result = await this.memoryService.getRelevantContext(
        conversationId,
        tenantId,
        '', // Query vacía para obtener contexto general
        10, // Últimos 10 mensajes
      );
      return {
        context: result.context,
        summary: result.summary,
      };
    } catch (error) {
      this.logger.warn(`Failed to get conversation context: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { context: [] };
    }
  }

  /**
   * Busca en la base de conocimiento usando RAG
   */
  private async searchKnowledgeBase(
    tenantId: string,
    query: string,
    language: string,
  ): Promise<{ results: Array<{ content: string; similarity: number }> }> {
    try {
      const searchResult = await this.semanticSearch.search(tenantId, query, {
        language,
        limit: 5,
      });

      return {
        results: searchResult.results.map((r) => ({
          content: r.content,
          similarity: r.similarity,
        })),
      };
    } catch (error) {
      this.logger.warn(`Knowledge base search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { results: [] };
    }
  }

  /**
   * Genera una respuesta usando OpenAI
   */
  private async generateResponse(params: {
    message: string;
    context: string;
    summary?: string;
    knowledgeContext: string;
    intent: Intent;
    language: string;
    agentConfig: { name?: string; personalitySettings?: unknown; defaultLanguage?: string } | null;
  }): Promise<string> {
    if (!this.openai) {
      throw new BadRequestException({
        success: false,
        error_key: 'ai.openai_not_configured',
        message: 'OpenAI API key not configured',
      });
    }

    const { message, context, summary, knowledgeContext, intent, language, agentConfig } = params;

    // Construir prompt del sistema
    const systemPrompt = this.buildSystemPrompt(language, agentConfig, intent);

    // Construir contexto para el usuario
    let userContext = `Mensaje del usuario: ${message}\n\n`;

    if (summary) {
      userContext += `Resumen de la conversación anterior:\n${summary}\n\n`;
    }

    if (context) {
      userContext += `Contexto reciente:\n${context}\n\n`;
    }

    if (knowledgeContext) {
      userContext += `Información relevante de la base de conocimiento:\n${knowledgeContext}\n\n`;
    }

    userContext += 'Genera una respuesta natural, útil y apropiada.';

    try {
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userContext,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return content.trim();
    } catch (error) {
      this.logger.error(`Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'ai.response_generation_failed',
        message: 'Failed to generate AI response',
      });
    }
  }

  /**
   * Construye el prompt del sistema según el idioma y configuración del agente
   */
  private buildSystemPrompt(
    language: string,
    agentConfig: { name?: string; personalitySettings?: unknown; defaultLanguage?: string } | null,
    intent: Intent,
  ): string {
    const langName = this.getLanguageName(language);
    const agentName = agentConfig?.name || this.getDefaultAgentName(language);
    
    // Construir prompt base según el idioma
    const prompts = this.getSystemPromptsByLanguage(language);
    let prompt = prompts.base.replace('{agentName}', agentName).replace('{langName}', langName);

    // Agregar personalidad si está configurada
    if (agentConfig?.personalitySettings && typeof agentConfig.personalitySettings === 'object') {
      const personality = agentConfig.personalitySettings as Record<string, unknown>;
      if (personality.tone) {
        prompt += prompts.personality.replace('{tone}', String(personality.tone));
      }
    }

    // Agregar instrucciones según la intención
    switch (intent) {
      case Intent.SCHEDULE_APPOINTMENT:
        prompt += prompts.intents.schedule;
        break;
      case Intent.CANCEL_APPOINTMENT:
        prompt += prompts.intents.cancel;
        break;
      case Intent.RESCHEDULE_APPOINTMENT:
        prompt += prompts.intents.reschedule;
        break;
      case Intent.REQUEST_INFO:
        prompt += prompts.intents.info;
        break;
    }

    prompt += prompts.closing;

    return prompt;
  }

  /**
   * Obtiene el nombre del idioma en ese idioma
   */
  private getLanguageName(languageCode: string): string {
    const languageNames: Record<string, string> = {
      'es': 'español',
      'en': 'English',
      'de': 'Deutsch',
      'fr': 'français',
      'it': 'italiano',
      'pt': 'português',
      'nl': 'Nederlands',
      'ru': 'русский',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'tr': 'Türkçe',
      'pl': 'polski',
      'sv': 'svenska',
      'da': 'dansk',
      'no': 'norsk',
      'fi': 'suomi',
      'cs': 'čeština',
      'hu': 'magyar',
      'ro': 'română',
      'bg': 'български',
      'hr': 'hrvatski',
      'sk': 'slovenčina',
      'sl': 'slovenščina',
      'el': 'Ελληνικά',
      'et': 'eesti',
      'lv': 'latviešu',
      'lt': 'lietuvių',
      'mt': 'Malti',
    };

    return languageNames[languageCode] || languageCode;
  }

  /**
   * Obtiene el nombre por defecto del agente según el idioma
   */
  private getDefaultAgentName(language: string): string {
    const defaultNames: Record<string, string> = {
      'es': 'Asistente',
      'en': 'Assistant',
      'de': 'Assistent',
      'fr': 'Assistant',
      'it': 'Assistente',
      'pt': 'Assistente',
      'nl': 'Assistent',
      'ru': 'Помощник',
      'ja': 'アシスタント',
      'ko': '어시스턴트',
      'zh': '助手',
      'ar': 'مساعد',
      'hi': 'सहायक',
      'tr': 'Asistan',
      'pl': 'Asystent',
      'sv': 'Assistent',
      'da': 'Assistent',
      'no': 'Assistent',
      'fi': 'Avustaja',
      'cs': 'Asistent',
      'hu': 'Asszisztens',
      'ro': 'Asistent',
      'bg': 'Асистент',
      'hr': 'Asistent',
      'sk': 'Asistent',
      'sl': 'Asistent',
      'el': 'Βοηθός',
      'et': 'Abiline',
      'lv': 'Asistents',
      'lt': 'Asistentas',
      'mt': 'Assistent',
    };

    return defaultNames[language] || 'Assistant';
  }

  /**
   * Obtiene los prompts del sistema según el idioma
   */
  private getSystemPromptsByLanguage(language: string): {
    base: string;
    personality: string;
    intents: {
      schedule: string;
      cancel: string;
      reschedule: string;
      info: string;
    };
    closing: string;
  } {
    const prompts: Record<string, {
      base: string;
      personality: string;
      intents: {
        schedule: string;
        cancel: string;
        reschedule: string;
        info: string;
      };
      closing: string;
    }> = {
      'es': {
        base: 'Eres {agentName}, un asistente virtual profesional y amigable. Responde siempre en {langName}. Sé conciso, claro y útil. ',
        personality: 'Tono: {tone}. ',
        intents: {
          schedule: 'El usuario quiere agendar una cita. Ayuda a encontrar disponibilidad y confirmar detalles. ',
          cancel: 'El usuario quiere cancelar una cita. Confirma la cancelación y ofrece alternativas si es apropiado. ',
          reschedule: 'El usuario quiere cambiar una cita. Ayuda a encontrar nueva disponibilidad. ',
          info: 'El usuario solicita información. Proporciona información clara y útil basándote en el contexto. ',
        },
        closing: 'Si no tienes suficiente información, pregunta amablemente.',
      },
      'en': {
        base: 'You are {agentName}, a professional and friendly virtual assistant. Always respond in {langName}. Be concise, clear, and helpful. ',
        personality: 'Tone: {tone}. ',
        intents: {
          schedule: 'The user wants to schedule an appointment. Help find availability and confirm details. ',
          cancel: 'The user wants to cancel an appointment. Confirm the cancellation and offer alternatives if appropriate. ',
          reschedule: 'The user wants to change an appointment. Help find new availability. ',
          info: 'The user requests information. Provide clear and helpful information based on the context. ',
        },
        closing: 'If you don\'t have enough information, ask politely.',
      },
      'de': {
        base: 'Du bist {agentName}, ein professioneller und freundlicher virtueller Assistent. Antworte immer auf {langName}. Sei prägnant, klar und hilfreich. ',
        personality: 'Ton: {tone}. ',
        intents: {
          schedule: 'Der Benutzer möchte einen Termin vereinbaren. Helfe bei der Suche nach Verfügbarkeit und Bestätigung der Details. ',
          cancel: 'Der Benutzer möchte einen Termin absagen. Bestätige die Stornierung und biete Alternativen an, wenn angemessen. ',
          reschedule: 'Der Benutzer möchte einen Termin ändern. Helfe bei der Suche nach neuer Verfügbarkeit. ',
          info: 'Der Benutzer bittet um Informationen. Biete klare und hilfreiche Informationen basierend auf dem Kontext. ',
        },
        closing: 'Wenn du nicht genug Informationen hast, frage höflich.',
      },
      'fr': {
        base: 'Vous êtes {agentName}, un assistant virtuel professionnel et amical. Répondez toujours en {langName}. Soyez concis, clair et utile. ',
        personality: 'Ton: {tone}. ',
        intents: {
          schedule: 'L\'utilisateur souhaite prendre rendez-vous. Aidez à trouver la disponibilité et confirmer les détails. ',
          cancel: 'L\'utilisateur souhaite annuler un rendez-vous. Confirmez l\'annulation et proposez des alternatives si approprié. ',
          reschedule: 'L\'utilisateur souhaite changer un rendez-vous. Aidez à trouver une nouvelle disponibilité. ',
          info: 'L\'utilisateur demande des informations. Fournissez des informations claires et utiles basées sur le contexte. ',
        },
        closing: 'Si vous n\'avez pas assez d\'informations, demandez poliment.',
      },
    };

    // Si no hay prompt específico, usar inglés como fallback
    return prompts[language] || prompts['en'];
  }

  /**
   * Verifica si la intención requiere una acción
   */
  private requiresAction(intent: Intent): boolean {
    return [
      Intent.SCHEDULE_APPOINTMENT,
      Intent.CANCEL_APPOINTMENT,
      Intent.RESCHEDULE_APPOINTMENT,
    ].includes(intent);
  }

  /**
   * Obtiene el tipo de acción requerida
   */
  private getActionType(intent: Intent): string | undefined {
    switch (intent) {
      case Intent.SCHEDULE_APPOINTMENT:
        return 'SCHEDULE';
      case Intent.CANCEL_APPOINTMENT:
        return 'CANCEL';
      case Intent.RESCHEDULE_APPOINTMENT:
        return 'RESCHEDULE';
      default:
        return undefined;
    }
  }

  /**
   * Registra la decisión de IA para análisis
   */
  private async logDecision(data: {
    conversationId: string;
    messageId: string;
    intent: Intent;
    confidence: number;
    knowledgeUsed: boolean;
    responseLength: number;
  }): Promise<void> {
    try {
            const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        select: { metadata: true },
      });

      const metadata = conversation?.metadata ? (typeof conversation.metadata === 'string' ? JSON.parse(conversation.metadata) : conversation.metadata) as Record<string, unknown> : {};
      const aiLogs = (metadata.aiLogs as Array<unknown>) || [];

      aiLogs.push({
        messageId: data.messageId,
        intent: data.intent,
        confidence: data.confidence,
        knowledgeUsed: data.knowledgeUsed,
        responseLength: data.responseLength,
        timestamp: new Date().toISOString(),
      });

            await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            aiLogs: aiLogs.slice(-50), // Mantener solo los últimos 50 logs
          }),
        },
      });

      this.logger.debug(`AI decision logged for message ${data.messageId}`);
    } catch (error) {
      this.logger.warn(`Failed to log AI decision: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

