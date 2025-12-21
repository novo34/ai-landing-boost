# AI-SPEC-48: Optimización de Rendimiento Frontend - Long Tasks

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **PRD Relacionado:** PRD-48  
> **Prioridad:** 🟡 MEDIA  
> **Alineado con:** `IA-Specs/05-frontend-standards.mdc`

---

## Arquitectura

### Componentes a Modificar

```
apps/web/
├── components/
│   ├── app/
│   │   ├── app-sidebar.tsx                      [MODIFICAR] - React.memo()
│   │   └── agents-list.tsx                      [MODIFICAR] - Virtualización
│   ├── appointments/
│   │   └── appointments-list.tsx                [MODIFICAR] - Virtualización
│   ├── conversations/
│   │   └── conversations-list.tsx                [MODIFICAR] - Virtualización
│   └── ... (otros componentes según auditoría)
├── app/
│   ├── app/
│   │   └── layout.tsx                           [MODIFICAR] - Optimizar efectos
│   └── ... (páginas según auditoría)
└── lib/
    └── perf/
        └── client-perf.ts                       [MODIFICAR] - Mejorar instrumentación
```

---

## Archivos a Crear/Modificar

### 1. Mejorar Instrumentación de Long Tasks

**Archivo:** `apps/web/lib/perf/client-perf.ts`

**Modificaciones:**

```typescript
/**
 * Inicializa el observador de long tasks con stack traces mejorados
 */
export function initLongTaskObserver() {
  if (!isDev || typeof window === 'undefined') return;

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Capturar stack trace
            const stack = new Error().stack || 'No stack available';
            
            // Capturar información de la ruta actual
            const pathname = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
            
            console.warn(
              `[PERF][CLIENT] Long task detected ... ${entry.duration.toFixed(2)}ms`,
              {
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
                pathname,
                stack: stack.split('\n').slice(0, 10).join('\n'), // Primeras 10 líneas del stack
              }
            );
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      if (isDev) {
        console.warn('[PERF] Long task observer not supported:', error);
      }
    }
  }
}
```

---

### 2. Crear Hook para Detectar Re-renders

**Archivo:** `apps/web/lib/perf/use-render-perf.ts` (nuevo)

```typescript
'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook para detectar re-renders excesivos en development
 */
export function useRenderPerf(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (renderCount.current > 10) {
      console.warn(
        `[PERF][CLIENT] ${componentName} re-rendered ${renderCount.current} times`,
        {
          timeSinceLastRender,
        }
      );
    }
  });
}
```

**Uso:**
```typescript
export function AgentsList({ agents }) {
  useRenderPerf('AgentsList');
  // ...
}
```

---

### 3. Optimizar AppLayout

**Archivo:** `apps/web/app/app/layout.tsx`

**Optimizaciones:**
- Memoizar callbacks
- Optimizar efectos
- Evitar re-renders innecesarios

```typescript
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
// ... otros imports

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // ... estado existente

  // Memoizar callbacks
  const checkAuth = useCallback(async () => {
    // ... código existente
  }, []); // Dependencias correctas

  const loadBranding = useCallback(async () => {
    // ... código existente
  }, [isChecking]); // Solo cuando isChecking cambia

  // Memoizar valores calculados
  const brandingStyles = useMemo(() => {
    if (!branding) return {};
    return {
      '--primary': branding.primaryColor,
      '--secondary': branding.secondaryColor,
    };
  }, [branding]);

  // ... resto del código
}
```

---

### 4. Optimizar AgentsList con React.memo() y Virtualización

**Archivo:** `apps/web/components/app/agents-list.tsx` (o similar)

**Instalar dependencia:**
```bash
cd apps/web
pnpm add @tanstack/react-virtual
```

**Implementación:**

```typescript
'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AgentCard } from './agent-card';

interface AgentsListProps {
  agents: Agent[];
  onSelect?: (agent: Agent) => void;
  loading?: boolean;
}

// Memoizar componente
export const AgentsList = React.memo(function AgentsList({
  agents,
  onSelect,
  loading,
}: AgentsListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualización para listas grandes
  const virtualizer = useVirtualizer({
    count: agents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Altura estimada de cada card
    overscan: 5, // Renderizar 5 items extra
  });

  if (loading) {
    return <AgentsListSkeleton />;
  }

  if (agents.length === 0) {
    return <EmptyState message="No hay agentes" />;
  }

  // Solo virtualizar si hay muchos items
  if (agents.length < 20) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  // Virtualización para listas grandes
  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <AgentCard
              agent={agents[virtualItem.index]}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.agents.length !== nextProps.agents.length) return false;
  
  // Comparar IDs de agentes
  const prevIds = prevProps.agents.map(a => a.id).sort().join(',');
  const nextIds = nextProps.agents.map(a => a.id).sort().join(',');
  
  return prevIds === nextIds;
});
```

---

### 5. Optimizar AgentCard con React.memo()

**Archivo:** `apps/web/components/app/agent-card.tsx` (o similar)

```typescript
'use client';

import React from 'react';
import { Agent } from '@/lib/api/client';

interface AgentCardProps {
  agent: Agent;
  onSelect?: (agent: Agent) => void;
}

export const AgentCard = React.memo(function AgentCard({
  agent,
  onSelect,
}: AgentCardProps) {
  const handleClick = React.useCallback(() => {
    onSelect?.(agent);
  }, [agent, onSelect]);

  return (
    <div
      onClick={handleClick}
      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
    >
      <h3>{agent.name}</h3>
      <p>Status: {agent.status}</p>
      {/* ... resto del contenido */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si el agente cambió
  return (
    prevProps.agent.id === nextProps.agent.id &&
    prevProps.agent.name === nextProps.agent.name &&
    prevProps.agent.status === nextProps.agent.status
  );
});
```

---

### 6. Optimizar ConversationsList

**Archivo:** `apps/web/components/conversations/conversations-list.tsx` (o similar)

```typescript
'use client';

import React, { useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Conversation } from '@/lib/api/client';

interface ConversationsListProps {
  conversations: Conversation[];
  onSelect?: (conversation: Conversation) => void;
  filters?: {
    status?: string;
    agentId?: string;
  };
}

export const ConversationsList = React.memo(function ConversationsList({
  conversations,
  onSelect,
  filters,
}: ConversationsListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoizar conversaciones filtradas
  const filteredConversations = useMemo(() => {
    if (!filters) return conversations;
    
    return conversations.filter(conv => {
      if (filters.status && conv.status !== filters.status) return false;
      if (filters.agentId && conv.agentId !== filters.agentId) return false;
      return true;
    });
  }, [conversations, filters]);

  const virtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const handleSelect = useCallback((conversation: Conversation) => {
    onSelect?.(conversation);
  }, [onSelect]);

  // ... implementación similar a AgentsList
});
```

---

### 7. Lazy Loading de Componentes Pesados

**Archivo:** `apps/web/components/appointments/calendar-view.tsx` (o similar)

```typescript
'use client';

import dynamic from 'next/dynamic';
import { CalendarSkeleton } from './calendar-skeleton';

// Lazy load del calendario (componente pesado)
const Calendar = dynamic(
  () => import('react-big-calendar').then(mod => ({
    default: mod.Calendar,
  })),
  {
    ssr: false, // No necesario en SSR
    loading: () => <CalendarSkeleton />,
  }
);

export function CalendarView({ appointments }) {
  return (
    <div className="h-[600px]">
      <Calendar
        events={appointments}
        // ... props
      />
    </div>
  );
}
```

---

### 8. Optimizar Efectos en Páginas

**Archivo:** `apps/web/app/app/agents/page.tsx`

**Antes:**
```typescript
useEffect(() => {
  loadData();
}, []); // Se ejecuta en cada mount

const loadData = async () => {
  // ... código
};
```

**Después:**
```typescript
const loadData = useCallback(async () => {
  // ... código
}, [filters]); // Solo cuando filters cambian

useEffect(() => {
  loadData();
}, [loadData]); // Dependencia correcta
```

---

### 9. Optimizar Transformaciones de Datos

**Archivo:** Cualquier componente que transforme datos

**Antes:**
```typescript
function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // ❌ Se ejecuta en cada render
  const activeAgents = agents
    .filter(a => a.status === 'ACTIVE')
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return <AgentsList agents={activeAgents} />;
}
```

**Después:**
```typescript
function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // ✅ Solo se recalcula cuando agents cambia
  const activeAgents = useMemo(() => {
    return agents
      .filter(a => a.status === 'ACTIVE')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);
  
  return <AgentsList agents={activeAgents} />;
}
```

---

## Proceso de Implementación

### Paso 1: Auditoría

1. Habilitar instrumentación mejorada de long tasks
2. Navegar por rutas críticas
3. Revisar logs `[PERF][CLIENT] Long task detected`
4. Identificar componentes que causan long tasks
5. Usar React DevTools Profiler para identificar re-renders
6. Documentar en `docs/perf-frontend-audit.md`

### Paso 2: Optimizaciones Incrementales

1. **Componentes críticos primero:**
   - AppLayout
   - AgentsList
   - ConversationsList
   - AppointmentsList

2. **Para cada componente:**
   - Identificar problemas (re-renders, long tasks)
   - Aplicar React.memo() si aplica
   - Optimizar efectos
   - Agregar virtualización si hay muchos items
   - Medir antes/después
   - Documentar cambios

### Paso 3: Lazy Loading

1. Identificar componentes pesados
2. Convertir a dynamic imports
3. Agregar loading states
4. Verificar que no hay regresiones

### Paso 4: Validación

1. Navegar por rutas optimizadas
2. Verificar que no hay long tasks > 100ms
3. Verificar que no hay regresiones
4. Documentar resultados

---

## Testing

### Tests de Performance

```typescript
describe('AgentsList Performance', () => {
  it('should render 100 agents without long tasks', async () => {
    const agents = Array.from({ length: 100 }, (_, i) => ({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      status: 'ACTIVE',
    }));
    
    render(<AgentsList agents={agents} />);
    
    // Verificar que no hay long tasks en los logs
    // (requiere mock de PerformanceObserver)
  });
  
  it('should not re-render when props do not change', () => {
    const { rerender } = render(<AgentsList agents={agents} />);
    const renderCount = jest.fn();
    
    rerender(<AgentsList agents={agents} />);
    
    // Verificar que no se re-renderiza
    expect(renderCount).toHaveBeenCalledTimes(1);
  });
});
```

---

## Dependencias a Instalar

```bash
cd apps/web
pnpm add @tanstack/react-virtual
```

---

## Documentación

### Archivo: `docs/perf-frontend-optimizations.md`

Documentar:
- Componentes optimizados
- React.memo() aplicado
- Virtualización implementada
- Lazy loading aplicado
- Long tasks antes/después
- Mejoras medidas

---

## Referencias

- `IA-Specs/05-frontend-standards.mdc` - Estándares de frontend
- `PRD-48-optimizacion-rendimiento-frontend-long-tasks.md` - PRD relacionado
- React Performance: https://react.dev/learn/render-and-commit
- React.memo: https://react.dev/reference/react/memo
- Virtualización: https://tanstack.com/virtual/latest
- React DevTools Profiler: https://react.dev/learn/react-developer-tools
