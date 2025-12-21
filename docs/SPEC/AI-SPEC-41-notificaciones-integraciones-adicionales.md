# AI-SPEC-41: Integraciones Adicionales de Notificaciones en Tiempo Real

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-41  
> **Estado:** Pendiente de Implementación

---

## Resumen Ejecutivo

Este SPEC detalla la implementación técnica para completar las integraciones de notificaciones en tiempo real en ConversationsService, TeamService y BillingService, así como la instalación de dependencias Socket.IO necesarias.

---

## Arquitectura

### Componentes Afectados

1. **apps/api/package.json** - Agregar dependencias
2. **ConversationsService** - Integrar notificaciones
3. **TeamService** - Integrar notificaciones
4. **BillingService** - Integrar notificaciones
5. **ConversationOrchestratorService** - Punto de entrada para mensajes entrantes

---

## Implementación Detallada

### 1. Instalar Dependencias Socket.IO

**Archivo:** `apps/api/package.json`

**Acción:** Ejecutar comando:
```bash
cd apps/api
npm install socket.io@^4.7.2 @nestjs/websockets@^10.3.0 @nestjs/platform-socket.io@^10.3.0 --legacy-peer-deps
```

**Verificar:** Dependencias aparecen en `dependencies`:
```json
{
  "dependencies": {
    "socket.io": "^4.7.2",
    "@nestjs/websockets": "^10.3.0",
    "@nestjs/platform-socket.io": "^10.3.0"
  }
}
```

---

### 2. Verificar NotificationsModule

**Archivo:** `apps/api/src/modules/notifications/notifications.module.ts`

**Verificar que existe y está configurado:**
```typescript
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService], // IMPORTANTE: Exportar para usar en otros módulos
})
export class NotificationsModule {}
```

**Si no está exportado:** Agregar `exports: [NotificationsService]`.

---

### 3. Integrar en ConversationsService

**Archivo:** `apps/api/src/modules/conversations/conversations.service.ts`

**Cambios:**

1. **Importar NotificationsService y tipos:**
```typescript
import { NotificationsService } from '../notifications/notifications.service';
import { $Enums } from '@prisma/client';
```

2. **Inyectar en constructor:**
```typescript
constructor(
  private prisma: PrismaService,
  private messagingService: WhatsAppMessagingService,
  private notificationsService: NotificationsService, // NUEVO
) {}
```

3. **Agregar método para notificar mensaje entrante:**
```typescript
/**
 * Notifica a usuarios sobre mensaje entrante
 */
private async notifyMessageReceived(
  tenantId: string,
  conversationId: string,
  messageContent: string,
  participantName?: string,
) {
  try {
    // Obtener conversación con agente
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        agent: {
          select: { id: true },
        },
      },
    });

    if (!conversation) return;

    // Obtener usuarios a notificar: OWNER, ADMIN, y AGENT asignado
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        OR: [
          { role: { in: ['OWNER', 'ADMIN'] } },
          ...(conversation.agentId
            ? [
                {
                  role: 'AGENT',
                  userId: {
                    in: await this.prisma.agent
                      .findUnique({
                        where: { id: conversation.agentId },
                        select: { userId: true },
                      })
                      .then((agent) => (agent?.userId ? [agent.userId] : [])),
                  },
                },
              ]
            : []),
        ],
      },
      select: { userId: true },
    });

    // Crear notificación para cada usuario
    for (const membership of memberships) {
      await this.notificationsService.createNotification(
        tenantId,
        membership.userId,
        $Enums.notification_type.MESSAGE_RECEIVED,
        'notifications.message.received',
        participantName
          ? `notifications.message.received_description`
          : 'notifications.message.received_description_unknown',
        `/app/conversations/${conversationId}`,
        {
          conversationId,
          messageContent: messageContent.substring(0, 100), // Primeros 100 caracteres
          participantName: participantName || conversation.participantPhone,
        },
      );
    }
  } catch (error) {
    this.logger.warn(
      `Failed to send message notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
```

4. **Llamar notificación cuando llega mensaje entrante:**

Buscar donde se procesan mensajes entrantes (probablemente en `ConversationOrchestratorService` o en el webhook handler) y agregar:

```typescript
// Después de guardar mensaje entrante
await this.notificationsService.notifyMessageReceived(
  tenantId,
  conversationId,
  messageContent,
  conversation.participantName,
);
```

**Nota:** Si el mensaje se procesa en `ConversationOrchestratorService`, agregar la lógica ahí o llamar a un método de `ConversationsService`.

---

### 4. Integrar en TeamService

**Archivo:** `apps/api/src/modules/team/team.service.ts`

**Cambios:**

1. **Importar NotificationsService:**
```typescript
import { NotificationsService } from '../notifications/notifications.service';
import { $Enums } from '@prisma/client';
```

2. **Inyectar en constructor:**
```typescript
constructor(
  private prisma: PrismaService,
  private notificationsService: NotificationsService, // NUEVO
) {}
```

3. **Modificar changeMemberRole:**
```typescript
async changeMemberRole(
  tenantId: string,
  targetUserId: string,
  newRole: TenantRole,
  requesterId: string,
) {
  // ... código existente de validación y actualización ...

  // NUEVO: Notificar al usuario afectado
  try {
    await this.notificationsService.createNotification(
      tenantId,
      targetUserId,
      $Enums.notification_type.TEAM_ROLE_CHANGED,
      'notifications.team.role_changed',
      'notifications.team.role_changed_description',
      '/app/settings/team',
      {
        newRole,
        previousRole: membership.role,
      },
    );
  } catch (error) {
    this.logger.warn(`Failed to send role change notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: true,
    data: updatedMembership,
  };
}
```

4. **Modificar removeMember:**
```typescript
async removeMember(tenantId: string, targetUserId: string, requesterId: string) {
  // ... código existente de validación y eliminación ...

  // NUEVO: Notificar al usuario removido
  try {
    await this.notificationsService.createNotification(
      tenantId,
      targetUserId,
      $Enums.notification_type.TEAM_MEMBER_REMOVED,
      'notifications.team.member_removed',
      'notifications.team.member_removed_description',
      '/',
      {
        tenantId,
      },
    );
  } catch (error) {
    this.logger.warn(`Failed to send removal notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: true,
    data: { message: 'Member removed' },
  };
}
```

5. **Modificar transferOwnership:**
```typescript
async transferOwnership(
  tenantId: string,
  newOwnerId: string,
  currentOwnerId: string,
) {
  // ... código existente de transferencia ...

  // NUEVO: Notificar a ambos usuarios
  try {
    // Notificar al nuevo OWNER
    await this.notificationsService.createNotification(
      tenantId,
      newOwnerId,
      $Enums.notification_type.TEAM_OWNERSHIP_TRANSFERRED,
      'notifications.team.ownership_transferred',
      'notifications.team.ownership_transferred_description',
      '/app/settings/team',
      {
        previousOwnerId: currentOwnerId,
      },
    );

    // Notificar al antiguo OWNER
    await this.notificationsService.createNotification(
      tenantId,
      currentOwnerId,
      $Enums.notification_type.TEAM_OWNERSHIP_TRANSFERRED,
      'notifications.team.ownership_transferred_from',
      'notifications.team.ownership_transferred_from_description',
      '/app/settings/team',
      {
        newOwnerId,
      },
    );
  } catch (error) {
    this.logger.warn(`Failed to send ownership transfer notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: true,
    data: updatedMembership,
  };
}
```

---

### 5. Integrar en BillingService

**Archivo:** `apps/api/src/modules/billing/billing.service.ts`

**Cambios:**

1. **Importar NotificationsService:**
```typescript
import { NotificationsService } from '../notifications/notifications.service';
import { $Enums } from '@prisma/client';
```

2. **Inyectar en constructor:**
```typescript
constructor(
  private prisma: PrismaService,
  private stripeService: StripeService,
  private notificationsService: NotificationsService, // NUEVO
) {}
```

3. **Modificar checkPlanLimits para notificar cuando se alcanza límite:**
```typescript
async checkPlanLimits(tenantId: string, resource: 'agents' | 'channels'): Promise<boolean> {
  const subscriptionResult = await this.getCurrentSubscription(tenantId);
  const plan = subscriptionResult.data.subscription.plan;
  const usage = await this.getUsage(tenantId);

  let limitReached = false;

  if (resource === 'agents') {
    const limit = plan.maxAgents;
    if (limit && usage.data.agents.current >= limit) {
      limitReached = true;
    }
  }

  if (resource === 'channels') {
    const limit = plan.maxChannels;
    if (limit && usage.data.channels.current >= limit) {
      limitReached = true;
    }
  }

  // NUEVO: Notificar si se alcanzó el límite
  if (limitReached) {
    try {
      const memberships = await this.prisma.tenantMembership.findMany({
        where: {
          tenantId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        select: { userId: true },
      });

      for (const membership of memberships) {
        await this.notificationsService.createNotification(
          tenantId,
          membership.userId,
          $Enums.notification_type.BILLING_LIMIT_REACHED,
          'notifications.billing.limit_reached',
          `notifications.billing.limit_reached_description_${resource}`,
          '/app/billing',
          {
            resource,
            limit: resource === 'agents' ? plan.maxAgents : plan.maxChannels,
            current: resource === 'agents' ? usage.data.agents.current : usage.data.channels.current,
          },
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send limit reached notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return !limitReached;
}
```

4. **Agregar notificación en handlePaymentFailure (si existe) o en webhook handler:**
```typescript
private async notifyPaymentFailure(tenantId: string, errorMessage?: string) {
  try {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
    });

    for (const membership of memberships) {
      await this.notificationsService.createNotification(
        tenantId,
        membership.userId,
        $Enums.notification_type.BILLING_PAYMENT_FAILED,
        'notifications.billing.payment_failed',
        'notifications.billing.payment_failed_description',
        '/app/billing',
        {
          errorMessage,
        },
      );
    }
  } catch (error) {
    this.logger.warn(`Failed to send payment failure notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

5. **Modificar cancelSubscription para notificar:**
```typescript
async cancelSubscription(tenantId: string) {
  // ... código existente de cancelación ...

  // NUEVO: Notificar cancelación
  try {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
    });

    for (const membership of memberships) {
      await this.notificationsService.createNotification(
        tenantId,
        membership.userId,
        $Enums.notification_type.BILLING_SUBSCRIPTION_CANCELLED,
        'notifications.billing.subscription_cancelled',
        'notifications.billing.subscription_cancelled_description',
        '/app/billing',
        {},
      );
    }
  } catch (error) {
    this.logger.warn(`Failed to send cancellation notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: true,
    data: { message: 'Subscription cancelled' },
  };
}
```

---

### 6. Actualizar Módulos para Importar NotificationsModule

**Archivos a modificar:**

1. **ConversationsModule:**
```typescript
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule], // Agregar NotificationsModule
  // ...
})
```

2. **TeamModule:**
```typescript
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule], // Agregar NotificationsModule
  // ...
})
```

3. **BillingModule:**
```typescript
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule], // Agregar NotificationsModule
  // ...
})
```

---

### 7. Verificar Tipos de Notificación en Prisma

**Archivo:** `apps/api/prisma/schema.prisma`

**Verificar que existe el enum con todos los tipos necesarios:**
```prisma
enum NotificationType {
  APPOINTMENT_CREATED
  APPOINTMENT_RESCHEDULED
  APPOINTMENT_CANCELLED
  MESSAGE_RECEIVED          // Verificar que existe
  CONVERSATION_NEW          // Verificar que existe
  TEAM_ROLE_CHANGED         // Verificar que existe
  TEAM_MEMBER_REMOVED       // Verificar que existe
  TEAM_OWNERSHIP_TRANSFERRED // Verificar que existe
  BILLING_LIMIT_REACHED     // Verificar que existe
  BILLING_PAYMENT_FAILED    // Verificar que existe
  BILLING_SUBSCRIPTION_CANCELLED // Verificar que existe
}
```

**Si faltan tipos:** Agregarlos y ejecutar migración.

---

## Testing

### Tests Unitarios

1. **ConversationsService:**
   - Test que `notifyMessageReceived()` se llama cuando llega mensaje
   - Test que notificación se crea correctamente

2. **TeamService:**
   - Test que notificación se envía al cambiar rol
   - Test que notificación se envía al remover miembro
   - Test que notificación se envía al transferir ownership

3. **BillingService:**
   - Test que notificación se envía al alcanzar límite
   - Test que notificación se envía al fallar pago
   - Test que notificación se envía al cancelar suscripción

### Tests de Integración

1. **WebSocket:**
   - Verificar que WebSocket se conecta
   - Verificar que notificaciones llegan en tiempo real
   - Verificar que múltiples usuarios reciben notificaciones

---

## Checklist de Implementación

- [ ] Instalar dependencias Socket.IO
- [ ] Verificar NotificationsModule exporta NotificationsService
- [ ] Integrar notificaciones en ConversationsService
- [ ] Integrar notificaciones en TeamService
- [ ] Integrar notificaciones en BillingService
- [ ] Actualizar módulos para importar NotificationsModule
- [ ] Verificar tipos de notificación en Prisma
- [ ] Ejecutar migración si faltan tipos
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Verificar que WebSocket funciona en tiempo real

---

**Última actualización:** 2025-01-XX

