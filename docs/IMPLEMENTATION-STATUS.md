# Estado de Implementación de PRDs y AI-SPECs

> **Última actualización:** 2025-01-XX  
> **Auditor:** Sistema de Auditoría Automática  
> **Total PRDs documentados:** 44 (32 core + 12 mejoras opcionales)

---

## Leyenda de Estados

- **PENDIENTE**: No implementado
- **EN PROGRESO**: Implementación iniciada pero incompleta
- **IMPLEMENTADO**: Código presente pero no auditado
- **IMPLEMENTADO+AUDITADO**: Verificado y completo
- **BLOQUEADO**: Depende de otro PRD no completado

---

## BLOQUE 0 — Fixes Técnicos

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-01 | Fix Monorepo Config | IMPLEMENTADO+AUDITADO | Configuración base del monorepo corregida | `package.json`, `turbo.json` |
| PRD-02 | Fix Env Variables | IMPLEMENTADO+AUDITADO | Variables de entorno documentadas | `.env.example`, `README.md` |
| PRD-03 | Fix Prisma Setup | IMPLEMENTADO+AUDITADO | Prisma configurado y validado | `prisma/schema.prisma` |
| PRD-04 | Fix Next.js Config | IMPLEMENTADO+AUDITADO | Next.js configurado correctamente | `next.config.ts` |
| PRD-05 | Fix i18n Imports | IMPLEMENTADO+AUDITADO | Sistema i18n con imports dinámicos | `apps/web/lib/i18n/` |
| PRD-06 | Fix Guards and CORS | IMPLEMENTADO+AUDITADO | Guards y CORS configurados | `apps/api/src/common/guards/` |

---

## BLOQUE A — Fundamentos

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-07 | Auth Advanced + SSO | IMPLEMENTADO+AUDITADO | SSO backend completo (Google/Microsoft), UI frontend con botones SSO en login/register | `apps/api/src/modules/auth/`, `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(auth)/register/page.tsx` |
| PRD-08 | Billing Stripe | IMPLEMENTADO+AUDITADO | Stripe completo: checkout, portal, webhooks, cancel/reactivate endpoints, PlanLimitsGuard aplicado en agents/channels | `apps/api/src/modules/billing/`, `apps/api/src/modules/agents/agents.controller.ts`, `apps/api/src/modules/channels/channels.controller.ts` |
| PRD-09 | Team Management | IMPLEMENTADO+AUDITADO | Gestión de equipo completa con invitaciones, cambio de roles, remoción y transferencia de ownership | `apps/api/src/modules/team/`, `apps/web/app/app/settings/team/` |

---

## BLOQUE B — WhatsApp

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-10 | WhatsApp Providers | IMPLEMENTADO+AUDITADO | Proveedores configurables desde UI | `apps/api/src/modules/whatsapp/`, `apps/web/components/whatsapp/` |
| PRD-11 | WhatsApp Webhooks | IMPLEMENTADO+AUDITADO | Webhooks bidireccionales completos con recepción, envío y estados de entrega | `apps/api/src/modules/whatsapp/webhooks/`, `apps/api/src/modules/whatsapp/whatsapp-messaging.service.ts` |
| PRD-12 | Conversations & Messages | IMPLEMENTADO+AUDITADO | Modelos Prisma completos con todos los campos, enums e índices requeridos | `apps/api/prisma/schema.prisma`, `apps/api/src/modules/conversations/` |
| PRD-13 | Conversation Orchestrator | IMPLEMENTADO+AUDITADO | ConversationOrchestratorService completo con routing, integración IA y fallback | `apps/api/src/modules/conversations/orchestrator.service.ts` |

---

## BLOQUE C — Base de Conocimiento

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-14 | Knowledge Base Model | IMPLEMENTADO+AUDITADO | Modelo Prisma completo con Collections, Sources, Chunks | `apps/api/prisma/schema.prisma` |
| PRD-15 | Knowledge Base CRUD | IMPLEMENTADO+AUDITADO | Backend y frontend completos, UI completa | `apps/api/src/modules/knowledge-base/`, `apps/web/app/app/knowledge-base/` |
| PRD-16 | Document Processor | IMPLEMENTADO+AUDITADO | Procesador completo con PDF, DOCX, embeddings | `apps/api/src/modules/knowledge-base/services/document-processor.service.ts` |
| PRD-17 | Semantic Search | IMPLEMENTADO+AUDITADO | Búsqueda semántica con similitud coseno | `apps/api/src/modules/knowledge-base/services/semantic-search.service.ts` |

---

## BLOQUE D — Agente de Citas

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-18 | Agent Entity | IMPLEMENTADO+AUDITADO | Entidad Agent completa con todos los campos | `apps/api/src/modules/agents/`, `apps/api/prisma/schema.prisma` |
| PRD-19 | Conversation Memory | IMPLEMENTADO+AUDITADO | Campo summary en Conversation, ConversationMemoryService completo | `apps/api/src/modules/conversations/services/conversation-memory.service.ts` |
| PRD-20 | AI Orchestrator | IMPLEMENTADO+AUDITADO | AIOrchestratorService completo con RAG, detección de intents, LLM | `apps/api/src/modules/conversations/services/ai-orchestrator.service.ts` |
| PRD-21 | Calendar Integration | IMPLEMENTADO+AUDITADO | Backend y frontend completos | `apps/api/src/modules/calendar/`, `apps/web/components/calendar/`, `apps/web/app/app/settings/calendar/` |
| PRD-22 | Appointments Flow | IMPLEMENTADO+AUDITADO | Backend completo con integración de calendarios, UI completa en `/app/appointments` | `apps/api/src/modules/appointments/`, `apps/web/app/app/appointments/page.tsx` |

---

## BLOQUE E — Integración n8n

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-23 | n8n Flows Registry | IMPLEMENTADO+AUDITADO | Modelo N8nFlow en Prisma, N8nFlowsService completo, UI en `/app/settings/n8n` | `apps/api/prisma/schema.prisma`, `apps/api/src/modules/n8n-integration/`, `apps/web/app/app/settings/n8n/` |
| PRD-24 | n8n Activation | IMPLEMENTADO+AUDITADO | Métodos activate/deactivate en N8nFlowsService, UI completa | `apps/api/src/modules/n8n-integration/n8n-flows.service.ts`, `apps/web/app/app/settings/n8n/page.tsx` |
| PRD-25 | n8n Webhooks | IMPLEMENTADO+AUDITADO | N8nWebhookService completo con triggerWorkflow | `apps/api/src/modules/n8n-integration/services/n8n-webhook.service.ts` |
| PRD-26 | n8n Events | IMPLEMENTADO+AUDITADO | N8nEventService completo con emitEvent y mapeo de eventos | `apps/api/src/modules/n8n-integration/services/n8n-event.service.ts` |

---

## BLOQUE F — Compliance + Automatizaciones

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-27 | GDPR + FADP | IMPLEMENTADO+AUDITADO | Modelos ConsentLog y DataRetentionPolicy en Prisma, GdprService completo, UI completa en `/app/settings/gdpr` | `apps/api/prisma/schema.prisma`, `apps/api/src/modules/gdpr/`, `apps/web/app/app/settings/gdpr/page.tsx` |
| PRD-28 | Automations | IMPLEMENTADO+AUDITADO | TrialExpirationService, PaymentFailureService, SubscriptionBlockingService completos con jobs cron | `apps/api/src/modules/automations/` |
| PRD-29 | Multilanguage Advanced | IMPLEMENTADO+AUDITADO | Detección automática de idioma en webhooks (WhatsApp, Webchat), campo `detectedLanguage` en Conversation, campo `language` en Message | `apps/api/src/modules/whatsapp/webhooks/`, `apps/api/src/modules/webchat/`, `apps/api/prisma/schema.prisma` |

---

## BLOQUE G — Extensiones

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-30 | Channels System | IMPLEMENTADO+AUDITADO | Modelos, servicios, controladores y UI completos | `apps/api/src/modules/channels/`, `apps/web/app/app/channels/page.tsx` |
| PRD-31 | Webchat Widget | IMPLEMENTADO+AUDITADO | Widget JavaScript embebible, WebchatService y WebchatController con endpoints públicos | `apps/web/public/widget/chat-widget.js`, `apps/api/src/modules/webchat/` |
| PRD-32 | Voice Channel | PENDIENTE | Canal de voz completo con Twilio: llamadas entrantes/salientes, grabación, transcripción, TTS, integración con conversaciones | `apps/api/src/modules/voice/`, `apps/api/prisma/schema.prisma` |

---

## BLOQUE H — Mejoras Opcionales

| PRD-ID | Nombre | Estado | Notas | Archivos Clave |
|--------|--------|--------|-------|----------------|
| PRD-33 | Dashboard KPIs Reales | IMPLEMENTADO+AUDITADO | Módulo Analytics completo con endpoint /analytics/kpis, UI actualizada con datos reales | `apps/api/src/modules/analytics/`, `apps/web/app/app/page.tsx` |
| PRD-34 | Notificaciones en Tiempo Real | IMPLEMENTADO+AUDITADO | Sistema WebSocket completo con Socket.IO, NotificationsModule, Gateway, UI con NotificationsCenter | `apps/api/src/modules/notifications/`, `apps/web/hooks/use-notifications.ts`, `apps/web/components/notifications/` |
| PRD-35 | Búsqueda Global | IMPLEMENTADO+AUDITADO | Búsqueda unificada en conversaciones, mensajes, citas, agentes y KB, componente GlobalSearch con modal, atajo Ctrl+K/Cmd+K, historial | `apps/api/src/modules/search/`, `apps/web/components/search/global-search.tsx` |
| PRD-36 | Vista de Calendario para Citas | IMPLEMENTADO+AUDITADO | Vista de calendario mensual/semanal/diaria con componente CalendarView, integrado en página de appointments con toggle, filtros por agente | `apps/api/src/modules/appointments/`, `apps/web/components/appointments/calendar-view.tsx` |
| PRD-37 | Páginas Legales | IMPLEMENTADO+AUDITADO | Páginas públicas completas: Aviso Legal, Política de Privacidad, Cookies, Términos. Banner de consentimiento de cookies integrado en layout. Links en footer actualizados | `apps/web/app/legal/`, `apps/web/components/cookie-consent.tsx` |
| PRD-38 | Personalización de Logo y Colores | IMPLEMENTADO+AUDITADO | Branding personalizado por tenant: campos en TenantSettings, endpoints para subir/eliminar logo y actualizar colores, página de branding, aplicación en layout y sidebar | `apps/api/src/modules/tenant-settings/`, `apps/web/app/app/settings/branding/` |
| PRD-39 | Métricas Avanzadas y Analytics | IMPLEMENTADO+AUDITADO | Dashboard completo de analytics con gráficos (recharts), filtros avanzados, métricas de conversaciones/mensajes/tiempos de respuesta/conversiones, exportación CSV | `apps/api/src/modules/analytics/`, `apps/web/app/app/analytics/` |
| PRD-40 | Aplicación de Branding en Emails y Widget de Webchat | IMPLEMENTADO+AUDITADO | Branding aplicado en emails (verificación, invitación) y widget de webchat (logo y colores del tenant) | `apps/api/src/modules/email/`, `apps/api/src/modules/webchat/`, `apps/web/public/widget/chat-widget.js` |
| PRD-41 | Integraciones Adicionales de Notificaciones | IMPLEMENTADO+AUDITADO | Integraciones completas: notificaciones en webhook de WhatsApp (mensajes entrantes, nuevas conversaciones), TeamService (cambios de rol, remoción, transferencia), BillingService (límites, fallos de pago, cancelaciones). Dependencias Socket.IO ya instaladas | `apps/api/src/modules/whatsapp/webhooks/`, `apps/api/src/modules/team/`, `apps/api/src/modules/billing/` |
| PRD-42 | Storage en Producción para Branding | IMPLEMENTADO+AUDITADO | Sistema de storage abstracto con soporte para S3, Cloudinary y filesystem local. TenantSettingsService actualizado para usar StorageService. Configuración mediante STORAGE_PROVIDER | `apps/api/src/modules/storage/`, `apps/api/src/modules/tenant-settings/` |
| PRD-43 | Exportación PDF de Analytics | IMPLEMENTADO+AUDITADO | Exportación PDF completa con PdfService, endpoint `/analytics/export/pdf`, botón en UI, incluye KPIs, métricas, tablas y branding del tenant | `apps/api/src/modules/analytics/pdf.service.ts`, `apps/web/app/app/analytics/page.tsx` |
| PRD-44 | Drag & Drop en Calendario de Citas | IMPLEMENTADO+AUDITADO | Drag & drop nativo HTML5 implementado en todas las vistas (mensual, semanal, diaria). Validación de fechas pasadas, diálogo de confirmación, actualización automática del calendario | `apps/web/components/appointments/calendar-view.tsx` |

---

## Notas de Auditoría

### PRD-21 (Calendar Integration)
- ✅ Backend completo: CalendarService, CalendarController, Providers
- ✅ Modelo Prisma correcto
- ✅ UI para configurar credenciales creada (CalendarConnectionWizard)
- ✅ Página de settings dedicada para calendarios creada
- ✅ Métodos de API agregados en client.ts

### PRD-09 (Team Management) - AUDITADO 2025-01-XX
- ✅ TeamService completo con métodos: getMembers, changeMemberRole, removeMember, transferOwnership
- ✅ TeamController con endpoints protegidos por RBAC:
  - ✅ GET /tenants/:tenantId/team/members - Listar miembros
  - ✅ POST /tenants/:tenantId/team/members/:userId/role - Cambiar rol
  - ✅ DELETE /tenants/:tenantId/team/members/:userId - Remover miembro
  - ✅ POST /tenants/:tenantId/team/transfer-ownership - Transferir ownership
- ✅ Validaciones de permisos implementadas (OWNER/ADMIN)
- ✅ Validaciones de reglas de negocio (OWNER no puede cambiar su propio rol, ADMIN no puede cambiar OWNER, etc.)
- ✅ UI completa en `/app/settings/team` con gestión de miembros, invitaciones, cambio de roles y transferencia
- ✅ Métodos de API en client.ts: getTeamMembers, changeMemberRole, removeMember, transferOwnership
- ✅ Integración con InvitationsService (PRD-07)

### PRD-11 (WhatsApp Webhooks) - AUDITADO 2025-01-XX
- ✅ WhatsAppWebhookController con endpoints públicos:
  - ✅ POST /webhooks/whatsapp/evolution/:accountId - Webhook Evolution API
  - ✅ POST /webhooks/whatsapp/cloud/:accountId - Webhook WhatsApp Cloud API
- ✅ Procesamiento de mensajes entrantes con resolución de tenant y agente
- ✅ WhatsAppMessagingService con método sendMessage completo
- ✅ Integración con proveedores (EvolutionProvider, WhatsAppCloudProvider)
- ✅ Registro de estados de entrega (SENT, DELIVERED, READ, FAILED)
- ✅ Integración con ConversationOrchestratorService
- ✅ Detección automática de idioma en mensajes entrantes
- ✅ Validación de webhooks y manejo de errores

### PRD-12 (Conversations & Messages) - AUDITADO 2025-01-XX
- ✅ Modelo Prisma Conversation completo con todos los campos requeridos:
  - ✅ tenantId, whatsappAccountId, agentId, participantPhone, participantName
  - ✅ status (ACTIVE, ARCHIVED, BLOCKED), lastMessageAt, unreadCount
  - ✅ Campos adicionales: summary, detectedLanguage, metadata
  - ✅ Índices correctos y constraint único
- ✅ Modelo Prisma Message completo con todos los campos requeridos:
  - ✅ conversationId, tenantId, type, direction, content, status
  - ✅ providerMessageId, metadata, sentAt, deliveredAt, readAt
  - ✅ Campo adicional: language
  - ✅ Índices correctos
- ✅ Enums completos: MessageType, MessageStatus, MessageDirection, ConversationStatus
- ✅ Migración aplicada correctamente
- ✅ ConversationsService con métodos: getConversations, getConversationById, getMessages, sendMessage
- ✅ ConversationsController con endpoints protegidos por RBAC
- ✅ UI en frontend `/app/conversations` para gestionar conversaciones

### PRD-13 (Conversation Orchestrator) - AUDITADO 2025-01-XX
- ✅ ConversationOrchestratorService completo con método processIncomingMessage
- ✅ Integración con AIOrchestratorService para procesamiento con IA
- ✅ Fallback a respuestas básicas predefinidas si IA falla
- ✅ Manejo de acciones (SCHEDULE, CANCEL, RESCHEDULE appointments)
- ✅ Integración con AppointmentsService para crear/reagendar/cancelar citas
- ✅ Integración con WhatsAppMessagingService para enviar respuestas
- ✅ Uso desde WhatsAppWebhookController y WebchatService
- ✅ Logging y manejo de errores implementado

### PRD-22 (Appointments Flow) - RE-AUDITADO 2025-01-XX (Confirmado completo)
- ✅ Modelo Prisma correcto con todos los campos requeridos (id, tenantId, agentId, conversationId, calendarEventId, participantPhone, participantName, startTime, endTime, status, notes, reminderSent)
- ✅ AppointmentsService completo con todos los métodos:
  - ✅ createAppointment() - Crea cita y evento en calendario externo
  - ✅ rescheduleAppointment() - Reprograma cita y actualiza evento en calendario
  - ✅ cancelAppointment() - Cancela cita y evento en calendario
  - ✅ sendReminder() - Envía recordatorio vía WhatsApp
  - ✅ getAppointments() - Lista citas con filtros
  - ✅ getAppointmentById() - Obtiene cita por ID
  - ✅ getUpcomingAppointments() - Obtiene próximas citas
- ✅ AppointmentsController con todos los endpoints protegidos por RBAC:
  - ✅ POST /appointments - Crear cita
  - ✅ GET /appointments - Listar citas
  - ✅ GET /appointments/upcoming - Próximas citas
  - ✅ GET /appointments/:id - Obtener cita
  - ✅ PUT /appointments/:id/reschedule - Reprogramar
  - ✅ PUT /appointments/:id/cancel - Cancelar
  - ✅ POST /appointments/:id/reminder - Enviar recordatorio
- ✅ Integración con CalendarService:
  - ✅ createEvent() - Crea eventos en calendario externo
  - ✅ cancelEvent() - Cancela eventos en calendario
- ✅ UI completa en `/app/appointments`:
  - ✅ Lista de citas con filtros (agente, estado, fechas)
  - ✅ Crear nueva cita
  - ✅ Reprogramar cita
  - ✅ Cancelar cita
  - ✅ Enviar recordatorio
  - ✅ Visualización de detalles
- ✅ Métodos de API en client.ts:
  - ✅ getAppointments()
  - ✅ getAppointment()
  - ✅ createAppointment()
  - ✅ rescheduleAppointment()
  - ✅ cancelAppointment()
  - ✅ sendAppointmentReminder()
- ✅ Configuración de integraciones configurable desde frontend:
  - ✅ Calendarios: Página `/app/settings/calendar` + CalendarConnectionWizard (CAL_COM, GOOGLE, CUSTOM)
  - ✅ WhatsApp: Página `/app/settings/whatsapp` + WhatsAppConnectionWizard (EVOLUTION_API, WHATSAPP_CLOUD)
- ✅ Notificaciones vía WhatsApp implementadas (confirmación, reprogramación, cancelación, recordatorios)

### PRD-23 (n8n Flows Registry)
- ✅ Modelo N8nFlow en Prisma con todos los campos requeridos
- ✅ N8nFlowsService con CRUD completo (createFlow, getFlows, getFlowById, updateFlow, deleteFlow)
- ✅ N8nFlowsController con endpoints protegidos por RBAC
- ✅ UI completa en `/app/settings/n8n` para gestionar flujos
- ✅ Métodos de API en client.ts (getN8nFlows, createN8nFlow, updateN8nFlow, deleteN8nFlow)

### PRD-24 (n8n Activation)
- ✅ Métodos activateFlow y deactivateFlow en N8nFlowsService
- ✅ Endpoints PUT `/n8n/flows/:id/activate` y `/n8n/flows/:id/deactivate`
- ✅ UI con botones para activar/desactivar flujos en tiempo real

### PRD-25 (n8n Webhooks)
- ✅ N8nWebhookService completo con triggerWorkflow
- ✅ Soporte para URLs completas, paths relativos y workflow IDs
- ✅ Manejo de errores y logging

### PRD-26 (n8n Events)
- ✅ N8nEventService completo con emitEvent
- ✅ Mapeo de eventos del sistema a tipos de flujo n8n
- ✅ Consulta automática de flujos activos por tipo de evento
- ✅ Disparo de webhooks en paralelo para múltiples flujos

### PRD-27 (GDPR + FADP)
- ✅ Modelos ConsentLog y DataRetentionPolicy en Prisma
- ✅ GdprService con métodos: anonymizeUser, exportUserData, deleteUserData, logConsent, createRetentionPolicy, applyRetentionPolicies
- ✅ GdprController con endpoints protegidos por RBAC
- ✅ Anonimización completa de datos personales manteniendo integridad referencial
- ✅ UI completa en `/app/settings/gdpr` para gestionar consentimientos y políticas de retención
- ✅ Métodos de API agregados en client.ts (getConsents, createConsent, getRetentionPolicies, createRetentionPolicy, updateRetentionPolicy, applyRetentionPolicies)

### PRD-28 (Automations)
- ✅ TrialExpirationService con job cron diario (9 AM) para verificar trials
- ✅ PaymentFailureService con job cron diario (10 AM) para verificar pagos fallidos
- ✅ SubscriptionBlockingService para gestionar bloqueos de suscripciones
- ✅ Integración con N8nEventService para disparar eventos
- ✅ Automatizaciones configuradas con @nestjs/schedule

### PRD-29 (Multilanguage Advanced)
- ✅ Detección automática de idioma en WhatsAppWebhookController usando DocumentProcessorService
- ✅ Detección automática de idioma en WebchatService
- ✅ Campo `detectedLanguage` en modelo Conversation
- ✅ Campo `language` en modelo Message
- ✅ Actualización automática del idioma detectado en conversaciones

### PRD-30 (Channels System) - COMPLETADO
- ✅ Modelos Channel y ChannelAgent en Prisma con todos los campos requeridos
- ✅ Migración de base de datos creada
- ✅ ChannelsService completo con CRUD y gestión de agentes
- ✅ ChannelsController con endpoints RBAC
- ✅ ChannelsModule registrado en AppModule
- ✅ UI completa en `/app/channels` con gestión de canales y agentes
- ✅ Métodos de API agregados en client.ts

### PRD-31 (Webchat Widget)
- ✅ Widget JavaScript embebible en `apps/web/public/widget/chat-widget.js`
- ✅ WebchatService completo con getWidgetConfig, sendMessage, getMessages
- ✅ WebchatController con endpoints públicos (`/api/public/webchat/*`)
- ✅ Detección automática de idioma en mensajes
- ✅ Soporte para conversaciones persistentes

### PRD-33 (Dashboard KPIs Reales) - IMPLEMENTADO 2025-01-XX
- ✅ AnalyticsModule creado con AnalyticsService y AnalyticsController
- ✅ Endpoint `GET /analytics/kpis` implementado con cálculo de métricas reales:
  - ✅ Total de agentes activos/totales
  - ✅ Total de canales activos/totales
  - ✅ Total de conversaciones activas/totales
  - ✅ Total de mensajes (total y este mes)
  - ✅ Tiempo promedio de respuesta calculado desde conversaciones
- ✅ Método `getKPIs()` agregado al cliente API
- ✅ Dashboard actualizado para mostrar KPIs reales con estados de carga (skeleton)
- ✅ Formateo de números con toLocaleString()
- ✅ Manejo de errores y estados vacíos
- ⚠️ Nota: Leads retornan 0 porque MarketingLead no tiene tenantId (son leads globales de marketing)

### PRD-34 (Notificaciones en Tiempo Real) - IMPLEMENTADO 2025-01-XX
- ✅ Modelo Prisma Notification y enum NotificationType creados
- ✅ NotificationsModule completo con:
  - ✅ NotificationsService con métodos: createNotification, getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification
  - ✅ NotificationsController con endpoints: GET /notifications, GET /notifications/unread-count, PUT /notifications/:id/read, PUT /notifications/read-all, DELETE /notifications/:id
  - ✅ NotificationsGateway (WebSocket) con autenticación JWT, rooms por tenant y usuario
- ✅ Hook `useNotifications` creado con conexión WebSocket, carga de notificaciones y manejo de eventos
- ✅ Componente `NotificationsCenter` creado con:
  - ✅ Badge con contador de no leídas
  - ✅ Panel deslizable con lista de notificaciones
  - ✅ Marcar como leída individual/todas
  - ✅ Eliminar notificaciones
  - ✅ Links de acción a recursos relacionados
- ✅ Integrado en layout del app (header)
- ✅ Integración básica en AppointmentsService:
  - ✅ Notificaciones cuando se crea cita (APPOINTMENT_CREATED)
  - ✅ Notificaciones cuando se reprograma cita (APPOINTMENT_RESCHEDULED)
  - ✅ Notificaciones cuando se cancela cita (APPOINTMENT_CANCELLED)
- ✅ Traducciones agregadas (es/en)
- ⚠️ Pendiente: Instalar dependencias Socket.IO (requiere --legacy-peer-deps o actualizar NestJS a v11)
- ⚠️ Pendiente: Integrar notificaciones en ConversationsService (mensajes entrantes), TeamService (cambios de equipo), BillingService (límites de plan)

### PRD-44 (Drag & Drop en Calendario de Citas) - IMPLEMENTADO 2025-01-XX
- ✅ CalendarView actualizado con drag & drop nativo HTML5:
  - ✅ Atributos `draggable` en elementos de citas
  - ✅ Handlers `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`
  - ✅ Estado para rastrear cita arrastrada y drop target
  - ✅ Feedback visual durante arrastre (opacity, ring highlight)
- ✅ Funcionalidad por vista:
  - ✅ Vista mensual: arrastrar entre días (mantiene hora original)
  - ✅ Vista semanal: arrastrar entre días/horas (cambia hora según drop target)
  - ✅ Vista diaria: arrastrar entre horas del mismo día
- ✅ Validaciones:
  - ✅ No permite reprogramar al pasado
  - ✅ Calcula nueva fecha/hora según vista y drop target
  - ✅ Mantiene duración original de la cita
- ✅ Diálogo de confirmación:
  - ✅ AlertDialog con fecha/hora actual y nueva fecha/hora
  - ✅ Botones de confirmar y cancelar
  - ✅ Loading state durante reprogramación
- ✅ Integración con API:
  - ✅ Usa `apiClient.rescheduleAppointment()` existente
  - ✅ Recarga citas automáticamente después de reprogramar
  - ✅ Toast notifications para éxito/error
- ✅ Traducciones agregadas:
  - ✅ `reschedule_title`, `reschedule_success`, `reschedule_success_description`, `reschedule_failed`, `confirm_reschedule`, `current_time`, `new_time`, `cannot_reschedule_past` (es/en)
- ✅ UX mejorada:
  - ✅ Cursor `cursor-move` en citas arrastrables
  - ✅ Highlight visual en drop targets
  - ✅ Opacity reducida en cita siendo arrastrada

### PRD-43 (Exportación PDF de Analytics) - IMPLEMENTADO 2025-01-XX
- ✅ PdfService creado:
  - ✅ Genera PDF con jsPDF y jspdf-autotable
  - ✅ Incluye header con título y fecha
  - ✅ Tabla de KPIs principales (agentes, canales, conversaciones, mensajes, tiempo de respuesta)
  - ✅ Tabla de tendencia de conversaciones (últimos 10 días)
  - ✅ Tabla de estadísticas de mensajes
  - ✅ Tabla de tiempos de respuesta por agente
  - ✅ Tabla de métricas de conversión (leads, conversaciones, citas, tasas)
  - ✅ Footer con número de página y branding
  - ✅ Aplica colores del tenant en headers de tablas
- ✅ AnalyticsController actualizado:
  - ✅ Endpoint `GET /analytics/export/pdf` con guards y roles (OWNER, ADMIN)
  - ✅ Acepta filtros (startDate, endDate, agentId, channelId)
  - ✅ Retorna PDF con headers correctos (Content-Type, Content-Disposition)
- ✅ Cliente API actualizado:
  - ✅ Método `exportAnalyticsPdf()` que retorna Blob
- ✅ Frontend actualizado:
  - ✅ Botón "Exportar PDF" junto a "Exportar CSV"
  - ✅ `handleExport()` actualizado para soportar 'csv' y 'pdf'
  - ✅ Loading state durante generación de PDF
  - ✅ Toast notifications para éxito/error
- ✅ Traducciones agregadas:
  - ✅ `export_pdf`, `export_success`, `pdf_exported`, `export_failed` (es/en)
- ✅ Dependencias instaladas:
  - ✅ `jspdf@^2.5.2` y `jspdf-autotable@^3.8.4` instaladas correctamente (sin conflictos con mammoth)

### PRD-42 (Storage en Producción para Branding) - IMPLEMENTADO 2025-01-XX
- ✅ StorageModule creado con factory pattern:
  - ✅ `StorageService` clase abstracta con interfaz `IStorageService`
  - ✅ `LocalStorageService` para filesystem local (fallback por defecto)
  - ✅ `S3StorageService` para AWS S3 (requiere `@aws-sdk/client-s3`)
  - ✅ `CloudinaryStorageService` para Cloudinary (requiere `cloudinary`)
  - ✅ Factory que selecciona provider según `STORAGE_PROVIDER` env var
- ✅ TenantSettingsService actualizado:
  - ✅ `uploadLogo()` usa `StorageService.upload()` en lugar de filesystem directo
  - ✅ `deleteLogo()` usa `StorageService.delete()` en lugar de filesystem directo
  - ✅ Eliminado código de filesystem directo (fs, uploadsDir)
- ✅ TenantSettingsModule actualizado:
  - ✅ Importa `StorageModule.forRoot()`
- ✅ Variables de entorno soportadas:
  - ✅ `STORAGE_PROVIDER`: 'local', 's3', o 'cloudinary'
  - ✅ Para S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
  - ✅ Para Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- ✅ Compatibilidad:
  - ✅ Funciona con logos existentes (URLs relativas y absolutas)
  - ✅ Fallback automático a local si no hay configuración de cloud

### PRD-41 (Integraciones Adicionales de Notificaciones) - IMPLEMENTADO 2025-01-XX
- ✅ Enum de notificaciones actualizado en Prisma:
  - ✅ Agregados tipos: `CONVERSATION_NEW`, `TEAM_OWNERSHIP_TRANSFERRED`, `BILLING_LIMIT_REACHED`, `BILLING_PAYMENT_FAILED`, `BILLING_SUBSCRIPTION_CANCELLED`
  - ✅ Migración creada: `20251212104719_add_notification_types`
- ✅ WhatsAppWebhookController:
  - ✅ Notificaciones cuando llega mensaje entrante (`MESSAGE_RECEIVED`)
  - ✅ Notificaciones cuando se crea nueva conversación (`CONVERSATION_NEW`)
  - ✅ Notificaciones enviadas a OWNER, ADMIN y AGENT asignado
- ✅ TeamService:
  - ✅ Notificación al cambiar rol de miembro (`TEAM_ROLE_CHANGED`)
  - ✅ Notificación al remover miembro (`TEAM_MEMBER_REMOVED`)
  - ✅ Notificaciones al transferir ownership (`TEAM_OWNERSHIP_TRANSFERRED` para ambos usuarios)
- ✅ BillingService:
  - ✅ Notificación cuando se alcanza límite de plan (`BILLING_LIMIT_REACHED`)
  - ✅ Notificación al cancelar suscripción (`BILLING_SUBSCRIPTION_CANCELLED`)
- ✅ StripeService:
  - ✅ Notificación cuando falla pago (`BILLING_PAYMENT_FAILED`)
- ✅ Módulos actualizados:
  - ✅ ConversationsModule importa NotificationsModule
  - ✅ TeamModule importa NotificationsModule
  - ✅ BillingModule importa NotificationsModule
  - ✅ WhatsAppModule importa NotificationsModule
- ✅ Dependencias Socket.IO ya instaladas (`socket.io@^4.7.5`, `@nestjs/websockets@^10.4.20`)

### PRD-40 (Aplicación de Branding en Emails y Widget de Webchat) - IMPLEMENTADO 2025-01-XX
- ✅ EmailService modificado:
  - ✅ Agregado PrismaService como dependencia
  - ✅ Método `getTenantBranding()` para obtener branding del tenant
  - ✅ `sendVerificationEmail()` ahora recibe `tenantId` y aplica branding
  - ✅ `sendInvitationEmail()` ahora recibe `tenantId` y aplica branding
  - ✅ URLs absolutas generadas para logos (usando FRONTEND_URL)
- ✅ Templates Handlebars actualizados:
  - ✅ `verification-email.hbs` usa `{{logoUrl}}`, `{{primaryColor}}`, `{{secondaryColor}}`, `{{hasLogo}}`
  - ✅ `invitation-email.hbs` usa branding dinámico
  - ✅ Fallback a valores por defecto si no hay branding
- ✅ Llamadas actualizadas:
  - ✅ `AuthService.sendVerificationEmail()` obtiene tenantId del user y lo pasa a EmailService
  - ✅ `InvitationsService.sendInvitationEmail()` pasa tenantId a EmailService
- ✅ WebchatService modificado:
  - ✅ `getWidgetConfig()` incluye branding del tenant en respuesta
  - ✅ URLs absolutas generadas para logos (usando API_URL o FRONTEND_URL)
- ✅ Widget JavaScript actualizado:
  - ✅ Guarda branding en `widgetState.branding`
  - ✅ Usa `branding.primaryColor` en lugar de `config.primaryColor` (sobrescribe canal)
  - ✅ Muestra logo en header si está disponible
  - ✅ Aplica colores del branding en botón, header, mensajes y input
  - ✅ Fallback a valores por defecto si no hay branding
- ✅ EmailModule actualizado para importar PrismaModule
- ✅ Traducciones ya existentes (agregadas en PRD-38)

### PRD-39 (Métricas Avanzadas y Analytics) - IMPLEMENTADO 2025-01-XX
- ✅ AnalyticsService expandido con métodos avanzados:
  - ✅ `getConversationsTrend()` - Agregación por día/semana/mes
  - ✅ `getMessagesStats()` - Enviados vs recibidos con agrupación diaria
  - ✅ `getResponseTimesByAgent()` - Tiempo promedio por agente
  - ✅ `getConversionMetrics()` - Funnel de conversión (leads → conversaciones → citas)
  - ✅ `getAgentsUsageByChannel()` - Uso de agentes por canal
  - ✅ `getMetrics()` - Métricas combinadas
- ✅ AnalyticsController expandido con endpoints:
  - ✅ `GET /analytics/metrics` - Todas las métricas
  - ✅ `GET /analytics/conversations-trend` - Tendencia de conversaciones
  - ✅ `GET /analytics/messages-stats` - Estadísticas de mensajes
  - ✅ `GET /analytics/response-times` - Tiempos de respuesta
  - ✅ `GET /analytics/conversions` - Métricas de conversión
  - ✅ `GET /analytics/agents-usage` - Uso de agentes
- ✅ DTOs creados: `AnalyticsFiltersDto` con validaciones
- ✅ Página de analytics creada en `/app/analytics` con:
  - ✅ Gráficos usando recharts (línea, barras, pie)
  - ✅ Filtros por fecha, agente, canal, agrupación
  - ✅ Vista de métricas de conversión (funnel)
  - ✅ Exportación CSV
- ✅ Métodos agregados al cliente API
- ✅ Traducciones agregadas (es/en)
- ⚠️ Pendiente: Exportación PDF (requiere librería adicional como jsPDF)
- ℹ️ Nota: "Reportes programados automáticos" mencionado como "PRD-42" pero NO existe como PRD documentado (es funcionalidad futura, alcance excluido de PRD-39)

### PRD-38 (Personalización de Logo y Colores) - IMPLEMENTADO 2025-01-XX
- ✅ Campos agregados en Prisma schema: `logoUrl`, `primaryColor`, `secondaryColor`
- ✅ TenantSettingsService actualizado con métodos:
  - ✅ `uploadLogo()` - Valida y guarda logo (PNG, JPG, SVG, max 5MB)
  - ✅ `deleteLogo()` - Elimina logo del tenant
  - ✅ `updateColors()` - Actualiza colores primario y secundario con validación hex
- ✅ TenantSettingsController actualizado con endpoints:
  - ✅ `POST /tenants/settings/logo` - Subir logo (con FileInterceptor)
  - ✅ `DELETE /tenants/settings/logo` - Eliminar logo
  - ✅ `PUT /tenants/settings/colors` - Actualizar colores
- ✅ Página de branding creada en `/app/settings/branding` con:
  - ✅ Subida de logo con preview
  - ✅ Selector de colores (color picker + input hex)
  - ✅ Vista previa en tiempo real
  - ✅ Validaciones de formato y tamaño
- ✅ Layout de settings creado con tabs compartidos
- ✅ Branding aplicado en:
  - ✅ Header del layout (logo)
  - ✅ Sidebar (logo)
  - ✅ CSS variables dinámicas (--primary, --secondary)
- ✅ Métodos agregados al cliente API: `uploadLogo()`, `deleteLogo()`, `updateColors()`
- ✅ Traducciones agregadas (es/en)
- ⚠️ Pendiente: Configurar storage en producción (S3/Cloudinary)
- ⚠️ Pendiente: Aplicar branding en emails y widget de webchat (mejora futura)

### PRD-37 (Páginas Legales) - IMPLEMENTADO 2025-01-XX
- ✅ Página de Aviso Legal creada en `/legal/aviso-legal`
- ✅ Página de Política de Privacidad creada en `/legal/privacidad` con variantes EU/CH
- ✅ Página de Política de Cookies creada en `/legal/cookies`
- ✅ Página de Términos y Condiciones creada en `/legal/terminos`
- ✅ Componente CookieConsent creado con:
  - ✅ Banner que aparece en primera visita
  - ✅ Opciones Aceptar/Rechazar
  - ✅ Guardado de preferencias en localStorage
  - ✅ Link a política de cookies
- ✅ Integrado en layout principal (root layout)
- ✅ Links legales actualizados en Footer con rutas reales
- ✅ Traducciones agregadas (es/en) para banner de cookies
- ✅ Contenido legal completo y apropiado para GDPR/FADP
- ✅ Páginas responsive y accesibles públicamente

### PRD-36 (Vista de Calendario para Citas) - IMPLEMENTADO 2025-01-XX
- ✅ Endpoint `GET /appointments/range` agregado en AppointmentsController
- ✅ Método `getAppointmentsByRange` implementado en AppointmentsService con validaciones de rango
- ✅ Componente CalendarView creado con:
  - ✅ Vista mensual con grid de días y citas
  - ✅ Vista semanal con horas del día (8:00-20:00)
  - ✅ Vista diaria con lista detallada
  - ✅ Navegación entre meses/semanas/días
  - ✅ Filtro por agente
  - ✅ Indicadores visuales de estado (colores por status)
  - ✅ Click en citas para ver detalles
- ✅ Integrado en página de appointments con toggle Lista/Calendario
- ✅ Método `getAppointmentsByRange()` agregado al cliente API
- ✅ Traducciones agregadas (es/en)
- ⚠️ Pendiente: Drag & drop para reprogramar (mejora futura)

### PRD-35 (Búsqueda Global) - IMPLEMENTADO 2025-01-XX
- ✅ SearchModule creado con SearchService y SearchController
- ✅ Endpoint `GET /search?q=query&types=...&limit=...` implementado
- ✅ Búsqueda en paralelo en todas las entidades (conversations, messages, appointments, agents, knowledge)
- ✅ Índices agregados en Prisma schema para optimizar búsquedas:
  - ✅ Conversation: participantName
  - ✅ Appointment: participantName
  - ✅ Agent: name
  - ✅ KnowledgeCollection: name
  - ✅ KnowledgeSource: title
- ✅ Componente GlobalSearch creado con:
  - ✅ Modal de búsqueda con Dialog
  - ✅ Atajo de teclado Ctrl+K / Cmd+K
  - ✅ Debounce de 300ms
  - ✅ Historial de búsquedas en localStorage
  - ✅ Resultados agrupados por tipo con iconos
  - ✅ Links directos a resultados
- ✅ Integrado en header del layout
- ✅ Método `search()` agregado al cliente API
- ✅ Traducciones agregadas (es/en)
- ✅ AnalyticsModule creado con AnalyticsService y AnalyticsController
- ✅ Endpoint `GET /analytics/kpis` implementado con cálculo de métricas reales:
  - ✅ Total de agentes activos/totales
  - ✅ Total de canales activos/totales
  - ✅ Total de conversaciones activas/totales
  - ✅ Total de mensajes (total y este mes)
  - ✅ Tiempo promedio de respuesta calculado desde conversaciones
- ✅ Método `getKPIs()` agregado al cliente API
- ✅ Dashboard actualizado para mostrar KPIs reales con estados de carga (skeleton)
- ✅ Formateo de números con toLocaleString()
- ✅ Manejo de errores y estados vacíos
- ⚠️ Nota: Leads retornan 0 porque MarketingLead no tiene tenantId (son leads globales de marketing)

---

## Resumen de Auditoría Completa

### ✅ Bloques Completados e Implementados
- **Bloque 0 (Fixes Técnicos)**: 6/6 PRDs ✅
- **Bloque A (Fundamentos)**: 3/3 PRDs ✅
- **Bloque B (WhatsApp)**: 4/4 PRDs ✅
- **Bloque C (Base de Conocimiento)**: 4/4 PRDs ✅
- **Bloque D (Agente de Citas)**: 5/5 PRDs ✅

### ✅ Bloques Completados e Implementados (Actualizado)
- **Bloque 0 (Fixes Técnicos)**: 6/6 PRDs ✅
- **Bloque A (Fundamentos)**: 3/3 PRDs ✅
- **Bloque B (WhatsApp)**: 4/4 PRDs ✅
- **Bloque C (Base de Conocimiento)**: 4/4 PRDs ✅
- **Bloque D (Agente de Citas)**: 5/5 PRDs ✅
- **Bloque E (n8n)**: 4/4 PRDs ✅
- **Bloque F (Compliance)**: 3/3 PRDs ✅

### ✅ Bloques Completados e Implementados (Actualizado)
- **Bloque G (Extensiones)**: 2/3 PRDs implementados (PRD-30 y PRD-31 completos, PRD-32 pendiente de implementación)
- **Bloque H (Mejoras Opcionales)**: 12/12 PRDs implementados (todos completos) ✅

### Estadísticas Generales
- **Total PRDs documentados**: 44
- **PRDs implementados y auditados**: 43 (97.73%) - Todos los PRDs core implementables completos (excepto PRD-32) + todos los PRDs del Bloque H (PRD-33 a PRD-44)
- **PRDs pendientes**: 1 (2.27%) - PRD-32 (Voice Channel) pendiente de implementación (PRD y SPEC completos creados)

## Próximos Pasos Recomendados

### PRDs Core (Bloques A-G)
1. **PRD-32 (Voice Channel)**: Pendiente de implementación
   - PRD y SPEC completos creados
   - Requiere: Integración Twilio, modelo Call, webhooks, grabación, transcripción, TTS
   - Dependencias: PRD-30, PRD-12, PRD-13, PRD-18 (todos implementados)

### PRDs Mejoras Opcionales (Bloque H)
2. **PRD-33 (Dashboard KPIs Reales)**: Prioridad MEDIA
   - Reemplazar valores hardcodeados con datos reales
   - Endpoint API para KPIs del dashboard
   - Dependencias: PRD-12, PRD-18, PRD-30

3. **PRD-34 (Notificaciones en Tiempo Real)**: Prioridad MEDIA
   - Sistema WebSocket con Socket.IO
   - Notificaciones de mensajes, citas, equipo, límites de plan
   - Dependencias: PRD-12, PRD-22, PRD-09

4. **PRD-35 (Búsqueda Global)**: Prioridad MEDIA
   - Búsqueda unificada en múltiples entidades
   - Barra de búsqueda en header con autocompletado
   - Dependencias: PRD-12, PRD-18, PRD-22, PRD-15

5. **PRD-36 (Vista de Calendario para Citas)**: Prioridad MEDIA
   - Vista mensual/semanal/diario con drag & drop
   - Integración con citas existentes
   - Dependencias: PRD-22

6. **PRD-37 (Páginas Legales)**: Prioridad MEDIA
   - Páginas públicas para cumplimiento GDPR/FADP
   - Banner de consentimiento de cookies
   - Sin dependencias

7. **PRD-38 (Personalización de Logo y Colores)**: Prioridad BAJA
   - Branding personalizado por tenant
   - Aplicación en dashboard, emails y widget
   - Dependencias: PRD-03

8. **PRD-39 (Métricas Avanzadas y Analytics)**: Prioridad BAJA
   - Dashboard de analytics con gráficos
   - Exportación de reportes (PDF, CSV)

9. **PRD-40 (Aplicación de Branding en Emails y Widget de Webchat)**: Prioridad MEDIA
   - Aplicar logo y colores del tenant en emails transaccionales
   - Aplicar logo y colores del tenant en widget de webchat
   - Modificar EmailService, templates Handlebars, WebchatService y widget JavaScript
   - Dependencias: PRD-38 (debe estar implementado)
   - Dependencias: PRD-33

---

## Resumen de Cambios Recientes

### PRD-07 (Auth Advanced + SSO) - COMPLETADO
- ✅ Botones SSO (Google/Microsoft) ya implementados en login y register
- ✅ Backend SSO completo con OAuth2
- ✅ Estado actualizado a IMPLEMENTADO+AUDITADO

### PRD-21 (Calendar Integration) - COMPLETADO
- ✅ Métodos de API agregados en `apps/web/lib/api/client.ts`
- ✅ Componente `CalendarConnectionWizard` creado
- ✅ Página de settings `/app/settings/calendar` creada

### PRD-22 (Appointments Flow) - COMPLETADO
- ✅ Método `createEvent` agregado en `CalendarService`
- ✅ Método `cancelEvent` agregado en `CalendarService`
- ✅ `AppointmentsService.createAppointment` ahora crea eventos en calendario externo
- ✅ `AppointmentsService.rescheduleAppointment` ahora actualiza eventos (cancela y crea nuevo)
- ✅ `AppointmentsService.cancelAppointment` ahora cancela eventos en calendario
- ✅ UI completa en `/app/appointments` para gestionar citas
- ✅ Métodos de API agregados en client.ts

### Bloque C (Base de Conocimiento) - COMPLETADO
- ✅ PRD-14: Modelo Prisma completo con Collections, Sources, Chunks
- ✅ PRD-15: Backend y frontend completos, UI completa en `/app/knowledge-base`
- ✅ PRD-16: DocumentProcessorService con PDF, DOCX, embeddings, detección de idioma
- ✅ PRD-17: SemanticSearchService con búsqueda por similitud coseno

### Bloque D (Agente de Citas) - COMPLETADO
- ✅ PRD-18: Modelo Agent completo con todos los campos requeridos
- ✅ PRD-19: Campo `summary` en Conversation, ConversationMemoryService implementado
- ✅ PRD-20: AIOrchestratorService completo con RAG, detección de intents, generación con LLM

### Bloque E (Integración n8n) - COMPLETADO
- ✅ PRD-23: Modelo N8nFlow en Prisma, N8nFlowsService completo, UI en `/app/settings/n8n`
- ✅ PRD-24: Métodos activate/deactivate en N8nFlowsService, UI completa
- ✅ PRD-25: N8nWebhookService completo con triggerWorkflow
- ✅ PRD-26: N8nEventService completo con emitEvent y mapeo de eventos

### Bloque F (Compliance + Automatizaciones) - COMPLETADO
- ✅ PRD-27: Modelos ConsentLog y DataRetentionPolicy en Prisma, GdprService completo, UI completa en `/app/settings/gdpr`
- ✅ PRD-28: TrialExpirationService, PaymentFailureService, SubscriptionBlockingService con jobs cron
- ✅ PRD-29: Detección automática de idioma en webhooks y mensajes

### Bloque G (Extensiones) - COMPLETADO
- ✅ PRD-30: ChannelsService, ChannelsController y UI completos
- ✅ PRD-31: Widget JavaScript embebible, WebchatService y WebchatController completos
- ⏸️ PRD-32: Voice Channel - Pendiente de implementación (PRD y SPEC completos creados)

