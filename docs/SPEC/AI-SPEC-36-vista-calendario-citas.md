# AI-SPEC-36: Vista de Calendario para Citas

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-36  
> **Prioridad:** 🟡 MEDIA

---

## Arquitectura

### Módulos NestJS a Modificar

```
apps/api/src/
├── modules/
│   └── appointments/
│       └── appointments.controller.ts            [MODIFICAR - Agregar endpoint por rango]
```

---

## Archivos a Crear/Modificar

### 1. Modificar Appointments Controller

**Archivo:** `apps/api/src/modules/appointments/appointments.controller.ts`

**Acción:** Agregar endpoint para obtener citas por rango de fechas

```typescript
/**
 * Obtiene citas en un rango de fechas (para calendario)
 */
@Get('range')
@Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.AGENT, TenantRole.VIEWER)
async getAppointmentsByRange(
  @CurrentTenant() tenant: { id: string; role: string },
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,
  @Query('agentId') agentId?: string,
) {
  return this.appointmentsService.getAppointmentsByRange(tenant.id, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    agentId,
  });
}
```

---

### 2. Modificar Appointments Service

**Archivo:** `apps/api/src/modules/appointments/appointments.service.ts`

**Acción:** Agregar método `getAppointmentsByRange`

```typescript
/**
 * Obtiene citas en un rango de fechas
 */
async getAppointmentsByRange(
  tenantId: string,
  filters: {
    startDate: Date;
    endDate: Date;
    agentId?: string;
  },
) {
  const where: any = {
    tenantId,
    startTime: {
      gte: filters.startDate,
      lte: filters.endDate,
    },
  };

  if (filters.agentId) {
    where.agentId = filters.agentId;
  }

  const appointments = await this.prisma.appointment.findMany({
    where,
    include: {
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  return {
    success: true,
    data: appointments,
  };
}
```

---

## Frontend - Componente de Calendario

### 3. Instalar Dependencias

```bash
npm install react-big-calendar date-fns
npm install --save-dev @types/react-big-calendar
```

---

### 4. Crear Componente de Calendario

**Archivo:** `apps/web/components/appointments/calendar-view.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';

interface Appointment {
  id: string;
  agentId: string;
  participantName?: string;
  participantPhone: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  agent?: {
    id: string;
    name: string;
  };
}

const localizer = momentLocalizer(moment);

export function CalendarView() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAppointments = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const response = await apiClient.getAppointmentsByRange(
        start.toISOString(),
        end.toISOString(),
      );
      if (response.success && response.data) {
        setAppointments(response.data);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  const handleRangeChange = useCallback((range: { start: Date; end: Date }) => {
    loadAppointments(range.start, range.end);
  }, [loadAppointments]);

  const handleSelectEvent = (event: any) => {
    // Abrir modal de detalles o redirigir
    window.location.href = `/app/appointments/${event.id}`;
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    // Abrir modal de creación con fecha/hora pre-rellenada
    // Implementar según necesidad
  };

  const events = appointments.map(apt => ({
    id: apt.id,
    title: `${apt.participantName || apt.participantPhone} - ${apt.agent?.name || ''}`,
    start: new Date(apt.startTime),
    end: new Date(apt.endTime),
    resource: apt,
  }));

  const eventStyleGetter = (event: any) => {
    const status = event.resource.status;
    let backgroundColor = '#3174ad';
    
    switch (status) {
      case 'CONFIRMED':
        backgroundColor = '#28a745';
        break;
      case 'PENDING':
        backgroundColor = '#ffc107';
        break;
      case 'CANCELLED':
        backgroundColor = '#dc3545';
        break;
      case 'COMPLETED':
        backgroundColor = '#6c757d';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  return (
    <div style={{ height: '600px' }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onRangeChange={handleRangeChange}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        messages={{
          next: t('calendar.next'),
          previous: t('calendar.previous'),
          today: t('calendar.today'),
          month: t('calendar.month'),
          week: t('calendar.week'),
          day: t('calendar.day'),
        }}
      />
    </div>
  );
}
```

**Nota:** Requiere instalar `moment` y `moment-timezone` para `momentLocalizer`, o usar `date-fns` localizer alternativo.

---

### 5. Actualizar Página de Appointments

**Archivo:** `apps/web/app/app/appointments/page.tsx`

**Acción:** Agregar toggle entre vista lista y calendario

```typescript
// Agregar estado para vista
const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

// Agregar toggle
<div className="flex items-center gap-2">
  <Button
    variant={viewMode === 'list' ? 'default' : 'outline'}
    onClick={() => setViewMode('list')}
  >
    {t('appointments.view_list')}
  </Button>
  <Button
    variant={viewMode === 'calendar' ? 'default' : 'outline'}
    onClick={() => setViewMode('calendar')}
  >
    {t('appointments.view_calendar')}
  </Button>
</div>

// Renderizar según vista
{viewMode === 'calendar' ? (
  <CalendarView />
) : (
  // Vista lista existente
)}
```

---

### 6. Agregar Método al Cliente API

**Archivo:** `apps/web/lib/api/client.ts`

```typescript
/**
 * Obtiene citas en un rango de fechas
 */
async getAppointmentsByRange(
  startDate: string,
  endDate: string,
  agentId?: string,
): Promise<ApiResponse<Appointment[]>> {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  if (agentId) {
    params.append('agentId', agentId);
  }
  return this.get(`/appointments/range?${params.toString()}`);
}
```

---

## DTOs

No se requieren DTOs nuevos. Se usa query parameters.

---

## Validaciones

- **Fechas:** Validar que startDate < endDate
- **Rango:** Limitar rango máximo (ej: 3 meses)
- **Permisos:** Todos los roles pueden ver, solo OWNER/ADMIN/AGENT pueden editar

---

## Errores Esperados

```typescript
- 'appointments.invalid_date_range'
- 'appointments.range_too_large'
- 'appointments.load_failed'
```

---

## Test Plan

### Unit Tests

1. **AppointmentsService:**
   - `getAppointmentsByRange` filtra por rango correctamente
   - `getAppointmentsByRange` filtra por agente si se proporciona
   - Manejo de rangos inválidos

### Integration Tests

1. **Flujo completo:**
   - Crear citas de prueba
   - Llamar a endpoint con rango
   - Verificar que solo devuelve citas en rango

---

## Checklist Final

- [ ] Endpoint `/appointments/range` agregado
- [ ] AppointmentsService actualizado
- [ ] Dependencias instaladas (react-big-calendar, date-fns)
- [ ] Componente CalendarView creado
- [ ] Página de appointments actualizada con toggle
- [ ] Cliente API actualizado
- [ ] Traducciones agregadas (es/en)
- [ ] Estilos de calendario aplicados
- [ ] Drag & drop implementado (opcional, requiere librería adicional)
- [ ] Tests escritos

---

## Notas de Implementación

- **Moment vs date-fns:** Considerar usar `date-fns` localizer en lugar de moment para reducir bundle size
- **Drag & drop:** `react-big-calendar` soporta drag & drop nativo, solo requiere configurar `onEventDrop`
- **Responsive:** Calendario puede ser difícil en mobile, considerar vista lista por defecto en mobile

---

**Última actualización:** 2025-01-XX

