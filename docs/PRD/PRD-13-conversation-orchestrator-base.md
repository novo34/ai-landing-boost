# PRD-13: Orquestador de Conversación Base

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟠 ALTA  
> **Estado:** Pendiente  
> **Bloque:** B - WhatsApp  
> **Dependencias:** PRD-11, PRD-12

---

## Objetivo

Crear el orquestador base que recibe mensajes entrantes, los procesa, y decide qué hacer (sin IA todavía, solo routing básico).

---

## Alcance INCLUIDO

- ✅ Recepción de mensajes entrantes
- ✅ Routing a agente correspondiente
- ✅ Respuestas básicas predefinidas
- ✅ Integración con sistema de conversaciones
- ✅ Preparación para integración con IA (futuro)

---

## Alcance EXCLUIDO

- ❌ Procesamiento con IA (queda para Bloque D)
- ❌ Búsqueda en base de conocimiento (queda para Bloque C)
- ❌ Integración con calendarios (queda para Bloque D)

---

## Requisitos Funcionales

### RF-01: Routing de Mensajes

Cuando llega un mensaje:
1. Identificar tenant y agente
2. Buscar conversación existente o crear nueva
3. Guardar mensaje
4. Enviar a orquestador
5. Orquestador decide acción (por ahora: respuesta básica o pasar a IA)

---

## Requisitos Técnicos

### RT-01: Servicio Orquestador

```typescript
@Injectable()
export class ConversationOrchestratorService {
  async processIncomingMessage(message: IncomingMessage) {
    // 1. Resolver tenant y agente
    // 2. Buscar/crear conversación
    // 3. Guardar mensaje
    // 4. Decidir acción (por ahora: respuesta básica)
    // 5. Enviar respuesta si aplica
  }
}
```

---

**Última actualización:** 2025-01-XX







