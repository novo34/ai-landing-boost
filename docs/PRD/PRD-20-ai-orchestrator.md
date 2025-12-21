# PRD-20: Motor IA Turn-by-Turn

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** D - Agente de Citas

---

## Objetivo

Orquestador IA que procesa mensajes, consulta KB, genera respuestas, y gestiona flujos de citas.

---

## Requisitos Funcionales

- Detección de idioma
- Consulta a base de conocimiento (RAG)
- Generación de respuestas con LLM
- Gestión de intents (agendar, cancelar, info)
- Integración con calendarios
- Logging de decisiones IA

---

## Requisitos Técnicos

**Servicio:**
```typescript
@Injectable()
export class AIOrchestratorService {
  async processMessage(message: IncomingMessage): Promise<Response> {
    // 1. Detectar idioma
    // 2. Obtener contexto conversacional
    // 3. Buscar en KB
    // 4. Generar respuesta con LLM
    // 5. Procesar acciones (agendar, etc.)
    // 6. Logging
  }
}
```

---

**Última actualización:** 2025-01-XX







