# PRD-35: Búsqueda Global

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Búsqueda y Filtros Avanzados  
> **Dependencias:** PRD-12, PRD-18, PRD-22, PRD-15

---

## Objetivo

Implementar una búsqueda global que permita a los usuarios buscar rápidamente en conversaciones, mensajes, citas, agentes y base de conocimiento desde una única barra de búsqueda.

---

## Alcance INCLUIDO

- ✅ Barra de búsqueda en el header
- ✅ Búsqueda en conversaciones (por participante, contenido de mensajes)
- ✅ Búsqueda en mensajes (por contenido)
- ✅ Búsqueda en citas (por participante, notas)
- ✅ Búsqueda en agentes (por nombre)
- ✅ Búsqueda en base de conocimiento (por título, contenido)
- ✅ Autocompletado mientras se escribe
- ✅ Resultados agrupados por tipo
- ✅ Links directos a resultados
- ✅ Historial de búsquedas recientes

---

## Alcance EXCLUIDO

- ❌ Búsqueda semántica avanzada (ya existe en KB)
- ❌ Filtros avanzados en resultados (queda para futuro)
- ❌ Búsqueda por voz (queda para futuro)
- ❌ Búsqueda en archivos adjuntos (queda para futuro)
- ❌ Búsqueda con operadores booleanos (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Barra de Búsqueda Global

**Descripción:** El sistema debe proporcionar una barra de búsqueda accesible desde cualquier página del dashboard.

**Ubicación:** Header del layout (`/app/layout.tsx`)

**Atajo de teclado:** `Ctrl+K` / `Cmd+K` para abrir búsqueda

**UI:**
- Input de búsqueda con icono de lupa
- Placeholder: "Buscar conversaciones, mensajes, citas..."
- Abre modal/dropdown con resultados
- Muestra resultados mientras se escribe (debounce 300ms)
- Muestra "No se encontraron resultados" si no hay matches

---

### RF-02: Búsqueda en Conversaciones

**Descripción:** Los usuarios deben poder buscar conversaciones por participante o contenido de mensajes.

**Campos a buscar:**
- `participantName` (nombre del participante)
- `participantPhone` (teléfono del participante)
- Contenido de mensajes dentro de la conversación

**Resultados:**
- Mostrar conversación con preview del mensaje relevante
- Resaltar términos de búsqueda
- Link a `/app/conversations/:id`

**Límites:**
- Máximo 10 resultados por tipo
- Ordenar por relevancia (matches exactos primero, luego parciales)

---

### RF-03: Búsqueda en Mensajes

**Descripción:** Los usuarios deben poder buscar mensajes por contenido.

**Campos a buscar:**
- `content` (contenido del mensaje)

**Resultados:**
- Mostrar mensaje con contexto (conversación, fecha)
- Resaltar términos de búsqueda
- Link a `/app/conversations/:id` (scroll al mensaje)

**Límites:**
- Máximo 20 resultados
- Solo mensajes del tenant actual

---

### RF-04: Búsqueda en Citas

**Descripción:** Los usuarios deben poder buscar citas por participante o notas.

**Campos a buscar:**
- `participantName`
- `participantPhone`
- `notes` (notas de la cita)

**Resultados:**
- Mostrar cita con fecha/hora
- Resaltar términos de búsqueda
- Link a `/app/appointments/:id`

**Límites:**
- Máximo 10 resultados
- Solo citas del tenant actual

---

### RF-05: Búsqueda en Agentes

**Descripción:** Los usuarios deben poder buscar agentes por nombre.

**Campos a buscar:**
- `name` (nombre del agente)

**Resultados:**
- Mostrar agente con estado
- Link a `/app/agents/:id`

**Límites:**
- Máximo 10 resultados

---

### RF-06: Búsqueda en Base de Conocimiento

**Descripción:** Los usuarios deben poder buscar en colecciones y fuentes de conocimiento.

**Campos a buscar:**
- `name` (nombre de colección)
- `title` (título de fuente)
- `content` (contenido de fuente)

**Resultados:**
- Mostrar colección o fuente con preview
- Resaltar términos de búsqueda
- Link a `/app/knowledge-base` (scroll a elemento)

**Límites:**
- Máximo 10 resultados por tipo (colecciones y fuentes)

---

### RF-07: Autocompletado

**Descripción:** El sistema debe mostrar sugerencias mientras el usuario escribe.

**Sugerencias:**
- Búsquedas recientes del usuario
- Nombres de participantes frecuentes
- Nombres de agentes
- Términos comunes de mensajes

**Comportamiento:**
- Mostrar hasta 5 sugerencias
- Resaltar término de búsqueda en sugerencias
- Seleccionar con teclado (↑↓) o mouse

---

### RF-08: Historial de Búsquedas

**Descripción:** El sistema debe recordar las últimas búsquedas del usuario.

**Funcionalidades:**
- Guardar últimas 10 búsquedas por usuario
- Mostrar en dropdown cuando se abre búsqueda
- Permitir hacer clic para repetir búsqueda
- Limpiar historial

**Persistencia:**
- Guardar en localStorage del navegador (no requiere backend)

---

## Requisitos Técnicos

### RT-01: Endpoint de Búsqueda

```
GET /search?q=query&types=conversations,messages,appointments,agents,knowledge&limit=10
```

**Query Parameters:**
- `q` (required): Término de búsqueda
- `types` (optional): Tipos a buscar (comma-separated). Default: todos
- `limit` (optional): Límite por tipo. Default: 10

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "juan",
    "results": {
      "conversations": [
        {
          "id": "conv_123",
          "participantName": "Juan Pérez",
          "participantPhone": "+34612345678",
          "preview": "Hola, necesito información...",
          "matchField": "participantName",
          "url": "/app/conversations/conv_123"
        }
      ],
      "messages": [
        {
          "id": "msg_456",
          "conversationId": "conv_123",
          "content": "Hola Juan, cómo estás?",
          "createdAt": "2025-01-15T10:30:00Z",
          "url": "/app/conversations/conv_123#msg_456"
        }
      ],
      "appointments": [],
      "agents": [],
      "knowledge": []
    },
    "total": 2
  }
}
```

---

### RT-02: Algoritmo de Búsqueda

**Estrategia:**
- Búsqueda case-insensitive
- Búsqueda parcial (LIKE %query%)
- Priorizar matches exactos
- Usar índices de BD para performance
- Limitar resultados por tipo para evitar sobrecarga

**Optimizaciones:**
- Usar FULLTEXT index en MySQL para mensajes y contenido de KB
- Cachear resultados frecuentes (Redis, TTL: 5 minutos)
- Debounce en frontend (300ms)

---

## Flujos UX

### Flujo 1: Búsqueda Básica

```
[Usuario presiona Ctrl+K]
  ↓
[Modal de búsqueda se abre]
  ↓
[Usuario escribe "juan"]
  ↓
[Frontend espera 300ms (debounce)]
  ↓
[Frontend llama a GET /search?q=juan]
  ↓
[Backend busca en todas las tablas]
  ↓
[Backend devuelve resultados agrupados]
  ↓
[Frontend muestra resultados]
  ↓
[Usuario hace clic en resultado]
  ↓
[Usuario es redirigido a página relevante]
```

---

## Estructura de DB

No se requieren cambios en el schema. Se utilizan modelos existentes con índices:
- `Conversation` - Índice en `participantName`, `participantPhone`
- `Message` - Índice FULLTEXT en `content`
- `Appointment` - Índice en `participantName`, `participantPhone`
- `Agent` - Índice en `name`
- `KnowledgeCollection` - Índice en `name`
- `KnowledgeSource` - Índice FULLTEXT en `title`, `content`

---

## Endpoints API

Ver RT-01.

---

## Eventos n8n

No se emiten eventos nuevos.

---

## Criterios de Aceptación

- [ ] Barra de búsqueda visible en header
- [ ] Atajo Ctrl+K/Cmd+K funciona
- [ ] Búsqueda funciona en todos los tipos especificados
- [ ] Resultados se muestran agrupados por tipo
- [ ] Links a resultados funcionan correctamente
- [ ] Autocompletado muestra sugerencias relevantes
- [ ] Historial de búsquedas funciona
- [ ] Performance aceptable (< 500ms para búsqueda)
- [ ] Búsqueda case-insensitive
- [ ] Resaltado de términos funciona

---

## Dependencias

- PRD-12: Conversations/Messages (para buscar conversaciones y mensajes)
- PRD-18: Agent Entity (para buscar agentes)
- PRD-22: Appointments Flow (para buscar citas)
- PRD-15: KB CRUD (para buscar en base de conocimiento)

---

**Última actualización:** 2025-01-XX

