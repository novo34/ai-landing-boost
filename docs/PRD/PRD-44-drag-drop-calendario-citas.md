# PRD-44: Drag & Drop en Calendario de Citas

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - UX  
> **Dependencias:** PRD-36 (Vista de Calendario para Citas), PRD-22 (Appointments Flow)

---

## Objetivo

Permitir a los usuarios reprogramar citas arrastrándolas en el calendario, mejorando la experiencia de usuario y la eficiencia en la gestión de citas.

---

## Contexto

Actualmente el calendario de citas solo permite visualización y click para ver detalles. Los usuarios deben usar el formulario de "Reagendar" para cambiar fechas/horas, lo cual es menos intuitivo.

---

## Alcance INCLUIDO

- ✅ Arrastrar citas en vista mensual
- ✅ Arrastrar citas en vista semanal
- ✅ Arrastrar citas en vista diaria
- ✅ Validación de disponibilidad al soltar
- ✅ Confirmación antes de reprogramar
- ✅ Actualización automática en calendario

---

## Alcance EXCLUIDO

- ❌ Arrastrar entre diferentes agentes (solo cambio de fecha/hora)
- ❌ Validación de conflictos con otras citas (queda para futuro)
- ❌ Arrastrar múltiples citas a la vez

---

## Requisitos Funcionales

### RF-01: Drag & Drop en Vista Mensual

**Descripción:** Permitir arrastrar citas entre días en la vista mensual.

**Comportamiento:**
1. Usuario arrastra cita a otro día
2. Sistema muestra preview de nueva fecha
3. Usuario suelta cita
4. Sistema valida disponibilidad
5. Sistema muestra confirmación
6. Si confirma, se reprograma la cita

---

### RF-02: Drag & Drop en Vista Semanal

**Descripción:** Permitir arrastrar citas entre horas/días en la vista semanal.

**Comportamiento:**
1. Usuario arrastra cita a otra hora/día
2. Sistema muestra preview de nueva fecha/hora
3. Usuario suelta cita
4. Sistema valida disponibilidad
5. Sistema muestra confirmación
6. Si confirma, se reprograma la cita

---

### RF-03: Drag & Drop en Vista Diaria

**Descripción:** Permitir arrastrar citas entre horas en la vista diaria.

**Comportamiento:**
Similar a vista semanal pero solo cambio de hora.

---

### RF-04: Validación de Disponibilidad

**Descripción:** Validar que el nuevo horario es válido antes de reprogramar.

**Validaciones:**
- Nueva fecha/hora no está en el pasado
- Nueva fecha/hora está dentro del horario laboral del agente
- No hay conflictos con otras citas (opcional, para futuro)

---

### RF-05: Confirmación de Reprogramación

**Descripción:** Pedir confirmación antes de reprogramar.

**Modal de confirmación:**
- Mostrar fecha/hora actual
- Mostrar nueva fecha/hora
- Botones: "Confirmar" y "Cancelar"

---

## Requisitos Técnicos

### RT-01: Instalar Librería de Drag & Drop

**Archivo:** `apps/web/package.json`

**Dependencia recomendada:**
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.0.8",
    "@dnd-kit/sortable": "^7.0.2",
    "@dnd-kit/utilities": "^3.2.1"
  }
}
```

**Alternativa:** `react-dnd` o `react-beautiful-dnd`

---

### RT-02: Modificar CalendarView Component

**Archivo:** `apps/web/components/appointments/calendar-view.tsx`

**Cambios:**
1. Agregar DndContext de @dnd-kit
2. Hacer elementos de citas draggable
3. Agregar drop zones en días/horas
4. Manejar eventos onDragStart, onDragEnd, onDrop
5. Llamar API para reprogramar

---

### RT-03: Endpoint API Existente

**Endpoint existente:** `POST /appointments/:id/reschedule`

**Usar endpoint existente de PRD-22.**

---

## Flujos UX

### Flujo 1: Reprogramar Cita Arrastrando

```
[Usuario ve cita en calendario]
  ↓
[Usuario arrastra cita a nuevo día/hora]
  ↓
[Sistema muestra preview de nueva fecha]
  ↓
[Usuario suelta cita]
  ↓
[Sistema valida disponibilidad]
  ↓
[Sistema muestra modal de confirmación]
  ↓
[Usuario confirma]
  ↓
[Sistema reprograma cita]
  ↓
[Calendario se actualiza automáticamente]
```

---

## Estructura de DB

No se requieren cambios. Se usa endpoint existente de reschedule.

---

## Endpoints API

No se requieren nuevos endpoints. Se usa:
- `POST /appointments/:id/reschedule` (existente)

---

## Criterios de Aceptación

- [ ] Citas se pueden arrastrar en vista mensual
- [ ] Citas se pueden arrastrar en vista semanal
- [ ] Citas se pueden arrastrar en vista diaria
- [ ] Preview de nueva fecha se muestra al arrastrar
- [ ] Validación de disponibilidad funciona
- [ ] Modal de confirmación aparece antes de reprogramar
- [ ] Cita se reprograma correctamente
- [ ] Calendario se actualiza automáticamente
- [ ] Feedback visual durante arrastre

---

## Dependencias

- **PRD-36:** Vista de Calendario para Citas (debe estar implementado)
- **PRD-22:** Appointments Flow (endpoint reschedule debe existir)

---

**Última actualización:** 2025-01-XX

