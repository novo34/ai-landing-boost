# AI-SPEC-44: Drag & Drop en Calendario de Citas

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-44  
> **Estado:** Pendiente de Implementación

---

## Resumen Ejecutivo

Este SPEC detalla la implementación de drag & drop en el calendario de citas usando @dnd-kit.

---

## Implementación Detallada

### 1. Instalar Dependencias

```bash
cd apps/web
npm install @dnd-kit/core@^6.0.8 @dnd-kit/sortable@^7.0.2 @dnd-kit/utilities@^3.2.1
```

---

### 2. Modificar CalendarView Component

**Archivo:** `apps/web/components/appointments/calendar-view.tsx`

**Cambios principales:**

```typescript
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

// En el componente:
const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null);

function handleDragStart(event: DragStartEvent) {
  setDraggedAppointment(event.active.id as string);
}

async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const appointmentId = active.id as string;
  const newDate = over.id as string; // ID del drop zone (fecha/hora)

  // Mostrar modal de confirmación
  const confirmed = await showConfirmDialog({
    title: 'Reprogramar cita',
    message: `¿Deseas reprogramar la cita a ${newDate}?`,
  });

  if (confirmed) {
    // Llamar API para reprogramar
    await apiClient.rescheduleAppointment(appointmentId, {
      startTime: new Date(newDate),
    });
    
    // Refrescar citas
    await loadAppointments();
  }

  setDraggedAppointment(null);
}

// En el render, envolver con DndContext:
<DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
  {/* Calendario */}
</DndContext>
```

---

## Checklist

- [ ] Instalar @dnd-kit
- [ ] Modificar CalendarView para drag & drop
- [ ] Agregar drop zones
- [ ] Implementar confirmación
- [ ] Tests

---

**Última actualización:** 2025-01-XX

