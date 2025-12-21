# PRD-36: Vista de Calendario para Citas

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - UX/UI  
> **Dependencias:** PRD-22

---

## Objetivo

Agregar una vista de calendario visual (mensual/semanal) para gestionar citas, permitiendo visualización intuitiva y reprogramación mediante drag & drop.

---

## Alcance INCLUIDO

- ✅ Vista de calendario mensual
- ✅ Vista de calendario semanal
- ✅ Vista de calendario diario
- ✅ Drag & drop para reprogramar citas
- ✅ Crear nueva cita desde calendario
- ✅ Ver detalles de cita al hacer clic
- ✅ Filtros por agente
- ✅ Indicadores visuales de estado
- ✅ Integración con citas existentes

---

## Alcance EXCLUIDO

- ❌ Sincronización bidireccional con calendarios externos (ya existe en PRD-21)
- ❌ Vista de agenda (lista temporal) - ya existe
- ❌ Notificaciones push (queda para PRD-34)
- ❌ Recordatorios automáticos (ya existe en backend)

---

## Requisitos Funcionales

### RF-01: Vista de Calendario Mensual

**Descripción:** Los usuarios deben poder ver todas las citas del mes en una vista de calendario tipo grid.

**UI:**
- Grid de 7 columnas (días de la semana)
- Filas por semanas del mes
- Cada celda muestra día del mes
- Citas se muestran como bloques dentro del día
- Color por estado (PENDING, CONFIRMED, CANCELLED, COMPLETED)
- Hover muestra tooltip con detalles

**Funcionalidades:**
- Navegación mes anterior/siguiente
- Botón "Hoy" para volver al mes actual
- Indicador de día actual

---

### RF-02: Vista de Calendario Semanal

**Descripción:** Los usuarios deben poder ver las citas de la semana en detalle.

**UI:**
- Vista de 7 días (lunes a domingo)
- Horas del día en eje Y (8:00 - 20:00)
- Citas se muestran como bloques en su hora correspondiente
- Altura del bloque proporcional a duración

**Funcionalidades:**
- Navegación semana anterior/siguiente
- Scroll vertical para ver todo el día
- Zoom in/out para ajustar rango de horas

---

### RF-03: Vista de Calendario Diario

**Descripción:** Los usuarios deben poder ver las citas de un día específico.

**UI:**
- Lista de horas del día
- Citas ordenadas por hora
- Vista detallada con más información

**Funcionalidades:**
- Navegación día anterior/siguiente
- Ver todas las citas del día

---

### RF-04: Drag & Drop para Reprogramar

**Descripción:** Los usuarios deben poder reprogramar citas arrastrándolas a otro día/hora.

**Flujo:**
1. Usuario arrastra cita a nuevo día/hora
2. Frontend muestra preview de nueva fecha
3. Usuario confirma
4. Frontend llama a `PUT /appointments/:id/reschedule`
5. Backend actualiza cita
6. Calendario se actualiza

**Validaciones:**
- Solo citas en estado PENDING o CONFIRMED pueden reprogramarse
- Validar que nueva fecha no esté en el pasado
- Validar disponibilidad del agente (opcional, futuro)

---

### RF-05: Crear Cita desde Calendario

**Descripción:** Los usuarios deben poder crear nuevas citas haciendo clic en un día/hora vacío.

**Flujo:**
1. Usuario hace clic en día/hora vacío
2. Modal de creación se abre
3. Fecha/hora pre-rellenada
4. Usuario completa formulario
5. Cita se crea y aparece en calendario

---

### RF-06: Filtros y Vista

**Descripción:** Los usuarios deben poder filtrar citas y cambiar entre vistas.

**Filtros:**
- Por agente (dropdown)
- Por estado (checkboxes)
- Por rango de fechas

**Vistas:**
- Mensual (default)
- Semanal
- Diario
- Lista (existente)

**Toggle:**
- Botones o tabs para cambiar vista
- Persistir preferencia en localStorage

---

## Requisitos Técnicos

### RT-01: Endpoint de Citas por Rango

```
GET /appointments?startDate=2025-01-01&endDate=2025-01-31&agentId=xxx
```

**Query Parameters:**
- `startDate` (required): Fecha inicio del rango
- `endDate` (required): Fecha fin del rango
- `agentId` (optional): Filtrar por agente

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "apt_123",
      "agentId": "agent_456",
      "participantName": "Juan Pérez",
      "participantPhone": "+34612345678",
      "startTime": "2025-01-15T10:00:00Z",
      "endTime": "2025-01-15T11:00:00Z",
      "status": "CONFIRMED",
      "notes": "Consulta inicial"
    }
  ]
}
```

---

### RT-02: Librería de Calendario

**Recomendación:** `react-big-calendar` o `@fullcalendar/react`

**Dependencias:**
```json
{
  "dependencies": {
    "react-big-calendar": "^1.8.0",
    "date-fns": "^2.30.0"
  }
}
```

---

## Flujos UX

### Flujo 1: Ver Calendario Mensual

```
[Usuario accede a /app/appointments]
  ↓
[Usuario selecciona vista "Mensual"]
  ↓
[Frontend calcula rango del mes]
  ↓
[Frontend llama a GET /appointments?startDate=...&endDate=...]
  ↓
[Backend devuelve citas del mes]
  ↓
[Frontend renderiza calendario con citas]
```

---

## Estructura de DB

No se requieren cambios. Se utiliza modelo `Appointment` existente.

---

## Endpoints API

Ver RT-01. Endpoint de reschedule ya existe en PRD-22.

---

## Eventos n8n

No se emiten eventos nuevos.

---

## Criterios de Aceptación

- [ ] Vista mensual muestra citas correctamente
- [ ] Vista semanal muestra citas correctamente
- [ ] Vista diaria muestra citas correctamente
- [ ] Drag & drop funciona para reprogramar
- [ ] Crear cita desde calendario funciona
- [ ] Filtros funcionan correctamente
- [ ] Navegación entre meses/semanas funciona
- [ ] Indicadores de estado son claros
- [ ] Responsive en mobile

---

## Dependencias

- PRD-22: Appointments Flow (endpoints existentes)

---

**Última actualización:** 2025-01-XX

