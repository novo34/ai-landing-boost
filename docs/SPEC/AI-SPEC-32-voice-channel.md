# AI-SPEC-32: Canal de Voz (Voice Channel) - Implementación Completa

> **Versión:** 2.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-32  
> **Estado:** Pendiente de Implementación

---

## Resumen Ejecutivo

Este SPEC detalla la implementación completa del canal de voz con integración Twilio, incluyendo llamadas entrantes/salientes, grabación, transcripción, TTS e integración con el sistema de conversaciones existente.

---

## Arquitectura

### Componentes Principales

1. **VoiceModule** - Módulo NestJS principal
2. **VoiceService** - Lógica de negocio de llamadas
3. **VoiceController** - Endpoints REST para gestión
4. **VoiceWebhookController** - Webhooks públicos de Twilio
5. **TwilioProvider** - Cliente y lógica de Twilio
6. **Call Model** - Modelo Prisma para llamadas
7. **UI Components** - Componentes React para gestión

---

## Implementación Detallada

### 1. Migración de Base de Datos

**Archivo:** `apps/api/prisma/schema.prisma`

**Agregar modelo Call y enums:**

```prisma
enum CallDirection {
  INBOUND
  OUTBOUND
}

enum CallStatus {
  RINGING
  IN_PROGRESS
  COMPLETED
  FAILED
  NO_ANSWER
  BUSY
  CANCELED
}

model Call {
  id                String        @id @default(cuid())
  tenantId          String
  conversationId    String?
  channelId         String
  agentId           String?
  direction         CallDirection
  fromPhone         String
  toPhone           String
  status            CallStatus    @default(RINGING)
  twilioCallSid     String?       @unique
  recordingUrl      String?
  recordingSid      String?
  transcriptionUrl  String?
  duration          Int?          // segundos
  startedAt         DateTime?
  endedAt           DateTime?
  metadata          Json?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  conversation  Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  channel       Channel       @relation(fields: [channelId], references: [id], onDelete: Cascade)
  agent         Agent?        @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([conversationId])
  @@index([channelId])
  @@index([twilioCallSid])
  @@index([status])
  @@index([createdAt])
}

// Agregar relación en Conversation
model Conversation {
  // ... campos existentes
  calls Call[]
}

// Agregar relación en Agent
model Agent {
  // ... campos existentes
  calls Call[]
}
```

**Ejecutar migración:**
```bash
npx prisma migrate dev --name add_voice_calls
```

---

### 2. Instalar Dependencias

**Archivo:** `apps/api/package.json`

```bash
cd apps/api
npm install twilio@^4.19.0
```

---

### 3. Crear TwilioProvider

**Archivo:** `apps/api/src/modules/voice/providers/twilio.provider.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';

@Injectable()
export class TwilioProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      this.logger.warn('Twilio credentials not configured');
      return;
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Realiza una llamada saliente
   */
  async makeCall(
    from: string,
    to: string,
    webhookUrl: string,
    statusCallbackUrl: string,
  ): Promise<twilio.twilio.Call> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    return this.client.calls.create({
      from,
      to,
      url: webhookUrl, // TwiML para manejar la llamada
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true, // Grabar automáticamente
      recordingStatusCallback: `${process.env.API_URL}/webhooks/voice/recording`,
    });
  }

  /**
   * Obtiene información de una llamada
   */
  async getCall(callSid: string): Promise<twilio.twilio.Call> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    return this.client.calls(callSid).fetch();
  }

  /**
   * Obtiene la URL de grabación
   */
  async getRecordingUrl(recordingSid: string): Promise<string> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    const recording = await this.client.recordings(recordingSid).fetch();
    return recording.uri.replace('.json', '.mp3');
  }

  /**
   * Obtiene la transcripción de una llamada
   */
  async getTranscription(callSid: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const transcriptions = await this.client.transcriptions.list({
        callSid,
        limit: 1,
      });

      if (transcriptions.length > 0) {
        return transcriptions[0].transcriptionText;
      }
    } catch (error) {
      this.logger.error(`Error getting transcription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return null;
  }
}
```

---

### 4. Crear VoiceService

**Archivo:** `apps/api/src/modules/voice/voice.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TwilioProvider } from './providers/twilio.provider';
import { ConversationOrchestratorService } from '../conversations/orchestrator.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private prisma: PrismaService,
    private twilioProvider: TwilioProvider,
    private orchestrator: ConversationOrchestratorService,
  ) {}

  /**
   * Inicia una llamada saliente
   */
  async initiateOutboundCall(
    tenantId: string,
    channelId: string,
    agentId: string,
    toPhone: string,
    fromPhone: string,
  ) {
    // Verificar que el canal existe y es de tipo VOICE
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        tenantId,
        type: 'VOICE',
        status: 'ACTIVE',
      },
      include: {
        channelAgents: {
          where: { agentId },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException({
        success: false,
        error_key: 'voice.channel_not_found',
      });
    }

    if (channel.channelAgents.length === 0) {
      throw new BadRequestException({
        success: false,
        error_key: 'voice.agent_not_assigned',
      });
    }

    // Obtener configuración del canal
    const config = channel.config as { twilioPhoneNumber?: string } | null;
    const twilioFrom = config?.twilioPhoneNumber || fromPhone;

    // Crear conversación
    const conversation = await this.prisma.conversation.create({
      data: {
        tenantId,
        whatsappAccountId: '', // Placeholder, Conversation requiere este campo
        participantPhone: toPhone,
        participantName: `Voice Call ${toPhone}`,
        status: 'ACTIVE',
        metadata: {
          channel: 'VOICE',
          channelId,
          direction: 'OUTBOUND',
        },
      },
    });

    // Crear registro de llamada
    const call = await this.prisma.call.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        channelId,
        agentId,
        direction: 'OUTBOUND',
        fromPhone: twilioFrom,
        toPhone,
        status: 'RINGING',
      },
    });

    // Realizar llamada vía Twilio
    try {
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const webhookUrl = `${apiUrl}/webhooks/voice/incoming?callId=${call.id}`;
      const statusCallbackUrl = `${apiUrl}/webhooks/voice/status`;

      const twilioCall = await this.twilioProvider.makeCall(
        twilioFrom,
        toPhone,
        webhookUrl,
        statusCallbackUrl,
      );

      // Actualizar con Twilio Call SID
      await this.prisma.call.update({
        where: { id: call.id },
        data: {
          twilioCallSid: twilioCall.sid,
          status: 'RINGING',
        },
      });

      return {
        success: true,
        data: {
          callId: call.id,
          conversationId: conversation.id,
          twilioCallSid: twilioCall.sid,
        },
      };
    } catch (error) {
      await this.prisma.call.update({
        where: { id: call.id },
        data: {
          status: 'FAILED',
        },
      });

      throw new BadRequestException({
        success: false,
        error_key: 'voice.call_failed',
        error_params: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  /**
   * Procesa llamada entrante
   */
  async handleIncomingCall(
    callId: string,
    fromPhone: string,
    toPhone: string,
    channelId: string,
  ) {
    // Obtener llamada
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        channel: {
          include: {
            channelAgents: {
              take: 1,
              include: {
                agent: true,
              },
            },
          },
        },
        conversation: true,
      },
    });

    if (!call) {
      throw new NotFoundException({
        success: false,
        error_key: 'voice.call_not_found',
      });
    }

    // Si no hay conversación, crear una
    let conversation = call.conversation;
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId: call.tenantId,
          whatsappAccountId: '', // Placeholder
          participantPhone: fromPhone,
          participantName: `Voice Call ${fromPhone}`,
          status: 'ACTIVE',
          metadata: {
            channel: 'VOICE',
            channelId,
            direction: 'INBOUND',
          },
        },
      });

      await this.prisma.call.update({
        where: { id: callId },
        data: { conversationId: conversation.id },
      });
    }

    // Obtener agente asignado
    const agent = call.channel.channelAgents[0]?.agent;
    if (!agent) {
      throw new BadRequestException({
        success: false,
        error_key: 'voice.no_agent_assigned',
      });
    }

    // Actualizar estado de llamada
    await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Generar TwiML para manejar la llamada
    return this.generateTwiML(conversation.id, agent.id, call.tenantId);
  }

  /**
   * Genera TwiML para manejar la llamada
   */
  private generateTwiML(conversationId: string, agentId: string, tenantId: string): string {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    // TwiML para:
    // 1. Reproducir mensaje de bienvenida
    // 2. Grabar la llamada
    // 3. Transcribir en tiempo real
    // 4. Enviar audio a nuestro webhook para procesamiento

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="es-ES">
    Hola, bienvenido. ¿En qué puedo ayudarte?
  </Say>
  <Gather 
    input="speech" 
    language="es-ES"
    speechTimeout="auto"
    action="${apiUrl}/webhooks/voice/gather?conversationId=${conversationId}&agentId=${agentId}&tenantId=${tenantId}"
    method="POST">
    <Say voice="alice" language="es-ES">
      Por favor, habla después del tono.
    </Say>
  </Gather>
  <Record 
    recordingStatusCallback="${apiUrl}/webhooks/voice/recording"
    transcribe="true"
    transcribeCallback="${apiUrl}/webhooks/voice/transcription"
    maxLength="60"/>
</Response>`;
  }

  /**
   * Procesa audio recibido del cliente
   */
  async processAudioInput(
    conversationId: string,
    agentId: string,
    tenantId: string,
    speechResult: string,
  ) {
    // Guardar transcripción como mensaje
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        tenantId,
        type: 'TEXT',
        direction: 'INBOUND',
        content: speechResult,
        status: 'DELIVERED',
        sentAt: new Date(),
      },
    });

    // Procesar con orquestador IA
    const response = await this.orchestrator.processIncomingMessage({
      conversationId,
      messageId: message.id,
      tenantId,
      whatsappAccountId: '', // Placeholder
      participantPhone: '', // Placeholder
      content: speechResult,
    });

    // Convertir respuesta a audio (TTS)
    // Nota: Twilio puede hacer TTS directamente en TwiML
    // O podemos usar Google Cloud TTS y reproducir audio

    return this.generateResponseTwiML(response.text || 'Lo siento, no pude procesar tu solicitud.');
  }

  /**
   * Genera TwiML con respuesta del agente
   */
  private generateResponseTwiML(text: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="es-ES">
    ${this.escapeXml(text)}
  </Say>
  <Gather 
    input="speech" 
    language="es-ES"
    speechTimeout="auto"
    action="${process.env.API_URL}/webhooks/voice/gather"
    method="POST">
  </Gather>
  <Say voice="alice" language="es-ES">
    Gracias por llamar. Hasta luego.
  </Say>
  <Hangup/>
</Response>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Actualiza estado de llamada
   */
  async updateCallStatus(callSid: string, status: string, duration?: number) {
    const call = await this.prisma.call.findUnique({
      where: { twilioCallSid: callSid },
    });

    if (!call) {
      this.logger.warn(`Call not found for SID: ${callSid}`);
      return;
    }

    const callStatus = this.mapTwilioStatusToCallStatus(status);

    await this.prisma.call.update({
      where: { id: call.id },
      data: {
        status: callStatus,
        duration,
        endedAt: callStatus === 'COMPLETED' || callStatus === 'FAILED' ? new Date() : undefined,
      },
    });
  }

  private mapTwilioStatusToCallStatus(twilioStatus: string): $Enums.CallStatus {
    const mapping: Record<string, $Enums.CallStatus> = {
      'queued': 'RINGING',
      'ringing': 'RINGING',
      'in-progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'busy': 'BUSY',
      'failed': 'FAILED',
      'no-answer': 'NO_ANSWER',
      'canceled': 'CANCELED',
    };

    return mapping[twilioStatus] || 'FAILED';
  }

  /**
   * Guarda URL de grabación
   */
  async saveRecording(callSid: string, recordingUrl: string, recordingSid: string) {
    const call = await this.prisma.call.findUnique({
      where: { twilioCallSid: callSid },
    });

    if (!call) {
      this.logger.warn(`Call not found for SID: ${callSid}`);
      return;
    }

    await this.prisma.call.update({
      where: { id: call.id },
      data: {
        recordingUrl,
        recordingSid,
      },
    });
  }

  /**
   * Lista llamadas del tenant
   */
  async getCalls(tenantId: string, filters?: {
    status?: $Enums.CallStatus;
    direction?: $Enums.CallDirection;
    limit?: number;
    offset?: number;
  }) {
    const calls = await this.prisma.call.findMany({
      where: {
        tenantId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.direction && { direction: filters.direction }),
      },
      include: {
        conversation: {
          select: {
            id: true,
            participantName: true,
            participantPhone: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return {
      success: true,
      data: calls,
    };
  }
}
```

---

### 5. Crear VoiceController

**Archivo:** `apps/api/src/modules/voice/voice.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { TenantRole } from '@prisma/client';

@Controller('voice')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('calls')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.AGENT)
  async initiateCall(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: {
      channelId: string;
      agentId: string;
      toPhone: string;
      fromPhone?: string;
    },
  ) {
    return this.voiceService.initiateOutboundCall(
      tenant.id,
      dto.channelId,
      dto.agentId,
      dto.toPhone,
      dto.fromPhone || '',
    );
  }

  @Get('calls')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.AGENT, TenantRole.VIEWER)
  async getCalls(
    @CurrentTenant() tenant: { id: string },
    @Query() filters: {
      status?: string;
      direction?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.voiceService.getCalls(tenant.id, filters);
  }

  @Get('calls/:id')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.AGENT, TenantRole.VIEWER)
  async getCall(
    @CurrentTenant() tenant: { id: string },
    @Param('id') callId: string,
  ) {
    // Implementar getCallById
    return { success: true, data: {} };
  }
}
```

---

### 6. Crear VoiceWebhookController

**Archivo:** `apps/api/src/modules/voice/voice-webhook.controller.ts`

```typescript
import { Controller, Post, Get, Query, Body, Res, Public } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { Response } from 'express';

@Controller('webhooks/voice')
@Public()
export class VoiceWebhookController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('incoming')
  async handleIncomingCall(
    @Query('callId') callId: string,
    @Body() body: {
      From?: string;
      To?: string;
      CallSid?: string;
    },
    @Res() res: Response,
  ) {
    // Obtener channelId del call
    // Generar TwiML
    const twiml = await this.voiceService.handleIncomingCall(
      callId,
      body.From || '',
      body.To || '',
      '', // channelId - obtener de call
    );

    res.type('text/xml');
    res.send(twiml);
  }

  @Post('status')
  async handleStatusCallback(@Body() body: {
    CallSid: string;
    CallStatus: string;
    CallDuration?: string;
  }) {
    await this.voiceService.updateCallStatus(
      body.CallSid,
      body.CallStatus,
      body.CallDuration ? parseInt(body.CallDuration) : undefined,
    );
  }

  @Post('recording')
  async handleRecording(@Body() body: {
    CallSid: string;
    RecordingUrl: string;
    RecordingSid: string;
  }) {
    await this.voiceService.saveRecording(
      body.CallSid,
      body.RecordingUrl,
      body.RecordingSid,
    );
  }

  @Post('transcription')
  async handleTranscription(@Body() body: {
    CallSid: string;
    TranscriptionText: string;
    TranscriptionUrl: string;
  }) {
    // Guardar transcripción como mensaje
    // Implementar lógica
  }

  @Post('gather')
  async handleGather(
    @Query('conversationId') conversationId: string,
    @Query('agentId') agentId: string,
    @Query('tenantId') tenantId: string,
    @Body() body: {
      SpeechResult?: string;
    },
    @Res() res: Response,
  ) {
    if (body.SpeechResult) {
      const twiml = await this.voiceService.processAudioInput(
        conversationId,
        agentId,
        tenantId,
        body.SpeechResult,
      );

      res.type('text/xml');
      res.send(twiml);
    } else {
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }
  }
}
```

---

### 7. Crear VoiceModule

**Archivo:** `apps/api/src/modules/voice/voice.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { VoiceWebhookController } from './voice-webhook.controller';
import { TwilioProvider } from './providers/twilio.provider';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [PrismaModule, ConversationsModule],
  controllers: [VoiceController, VoiceWebhookController],
  providers: [VoiceService, TwilioProvider],
  exports: [VoiceService],
})
export class VoiceModule {}
```

---

### 8. Variables de Entorno

**Archivo:** `.env`

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# API URL para webhooks
API_URL=https://your-api-domain.com
```

---

## Checklist de Implementación

- [ ] Crear migración de BD (modelo Call)
- [ ] Instalar dependencia Twilio
- [ ] Crear TwilioProvider
- [ ] Crear VoiceService
- [ ] Crear VoiceController
- [ ] Crear VoiceWebhookController
- [ ] Crear VoiceModule
- [ ] Registrar VoiceModule en AppModule
- [ ] Configurar variables de entorno
- [ ] Configurar webhooks en Twilio
- [ ] Crear UI para gestión de llamadas
- [ ] Tests unitarios
- [ ] Tests de integración

---

**Última actualización:** 2025-01-XX
