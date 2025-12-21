# PRD-48: Optimización de Rendimiento Frontend - Long Tasks

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Optimizaciones de Rendimiento  
> **Dependencias:** PRD-47 (Optimización Backend), Fix #1 (Deduplicación de Requests) ✅

---

## Objetivo

Reducir las long tasks (tareas que bloquean el main thread >50ms) en el frontend para mejorar la fluidez de la UI y eliminar congelamientos perceptibles durante la navegación y renderizado.

---

## Contexto

### Problema Identificado

**Evidencia de logs de performance:**
- Long tasks detectados:
  - 250ms ⚠️ (inicial, probablemente hot reload)
  - 62ms ⚠️
  - 61ms ⚠️
  - 152ms ⚠️
  - 177ms ⚠️

**Causas raíz probables:**
- Re-renders masivos de React
- Componentes pesados sin memoización
- Procesamiento pesado en el cliente (transformaciones de datos)
- Hot reload de Next.js (solo en desarrollo)
- Componentes que procesan grandes listas sin virtualización
- Efectos que se ejecutan en cada render

**Impacto:**
- UI se congela ocasionalmente
- Navegación se siente lenta
- Percepción de lentitud general

---

## Alcance INCLUIDO

- ✅ Identificación de componentes que causan long tasks
- ✅ Optimización de re-renders con React.memo()
- ✅ Lazy loading de componentes pesados
- ✅ Virtualización de listas grandes
- ✅ Optimización de efectos (useEffect, useMemo, useCallback)
- ✅ Code splitting más agresivo
- ✅ Optimización de transformaciones de datos
- ✅ Instrumentación de long tasks (identificar origen)

---

## Alcance EXCLUIDO

- ❌ Refactor masivo de componentes existentes
- ❌ Cambios en la lógica de negocio
- ❌ Optimizaciones de bundles (queda para futura mejora)
- ❌ Optimizaciones de imágenes (queda para futura mejora)
- ❌ Service Workers (queda para futura mejora)

---

## Requisitos Funcionales

### RF-01: Identificación de Componentes Problemáticos

**Descripción:** Identificar qué componentes causan long tasks.

**Proceso:**
1. Usar PerformanceObserver para detectar long tasks
2. Agregar stack traces a los logs de long tasks
3. Identificar componentes que se renderizan durante long tasks
4. Documentar componentes problemáticos

**Instrumentación mejorada:**
```typescript
// Mejorar client-perf.ts para incluir stack traces
PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn(
        `[PERF][CLIENT] Long task detected ... ${entry.duration.toFixed(2)}ms`,
        {
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          stack: new Error().stack, // Stack trace
        }
      );
    }
  }
});
```

---

### RF-02: Optimización de Re-renders con React.memo()

**Descripción:** Evitar re-renders innecesarios de componentes pesados.

**Componentes candidatos:**
- Componentes de lista (agents, appointments, conversations)
- Componentes de formulario complejos
- Componentes con muchos props
- Componentes que renderizan datos grandes

**Implementación:**
```typescript
// Antes
export function AgentsList({ agents, onSelect }) {
  return (
    <div>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} onSelect={onSelect} />
      ))}
    </div>
  );
}

// Después
export const AgentsList = React.memo(function AgentsList({ agents, onSelect }) {
  return (
    <div>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} onSelect={onSelect} />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada si es necesario
  return prevProps.agents.length === nextProps.agents.length &&
         prevProps.agents.every((a, i) => a.id === nextProps.agents[i]?.id);
});
```

**Reglas:**
- Usar React.memo() en componentes que:
  - Se renderizan frecuentemente
  - Tienen props que cambian poco
  - Son pesados (muchos elementos, cálculos complejos)
- No usar React.memo() en:
  - Componentes pequeños y simples
  - Componentes con props que cambian siempre
  - Componentes que son wrappers simples

---

### RF-03: Lazy Loading de Componentes Pesados

**Descripción:** Cargar componentes pesados de forma diferida.

**Componentes candidatos:**
- Calendarios (react-big-calendar, etc.)
- Editores de texto (rich text editors)
- Gráficos y visualizaciones
- Modales complejos
- Formularios grandes

**Implementación:**
```typescript
// Antes
import { Calendar } from '@/components/calendar';
import { RichTextEditor } from '@/components/editor';

// Después
const Calendar = dynamic(() => import('@/components/calendar').then(mod => ({ default: mod.Calendar })), {
  ssr: false, // No necesario en SSR
  loading: () => <CalendarSkeleton />,
});

const RichTextEditor = dynamic(() => import('@/components/editor').then(mod => ({ default: mod.RichTextEditor })), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
```

---

### RF-04: Virtualización de Listas Grandes

**Descripción:** Usar virtualización para listas con muchos elementos.

**Componentes candidatos:**
- Lista de agentes (si hay muchos)
- Lista de conversaciones
- Lista de mensajes en chat
- Lista de appointments en calendario

**Implementación:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function AgentsList({ agents }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: agents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Altura estimada de cada item
    overscan: 5, // Renderizar 5 items extra fuera de vista
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
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
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <AgentCard agent={agents[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### RF-05: Optimización de Efectos

**Descripción:** Optimizar useEffect, useMemo, useCallback para evitar ejecuciones innecesarias.

**Problemas comunes:**
- useEffect sin dependencias correctas
- useMemo/usecallback con dependencias que cambian siempre
- Efectos que se ejecutan en cada render

**Implementación:**
```typescript
// Antes
useEffect(() => {
  // Se ejecuta en cada render
  processData(data);
}, [data]); // data cambia siempre

// Después
const processedData = useMemo(() => {
  return processData(data);
}, [data.id, data.status]); // Solo recalcular si cambian campos relevantes

useEffect(() => {
  // Solo ejecutar cuando processedData realmente cambia
  updateUI(processedData);
}, [processedData]);
```

---

### RF-06: Optimización de Transformaciones de Datos

**Descripción:** Mover transformaciones pesadas fuera del render o usar useMemo.

**Problema:**
```typescript
// ❌ MAL - Se ejecuta en cada render
function AgentsList({ agents }) {
  const sortedAgents = agents
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(agent => ({
      ...agent,
      displayName: `${agent.name} (${agent.status})`,
    }))
    .filter(agent => agent.status === 'ACTIVE');
  
  return <div>{/* ... */}</div>;
}
```

**Solución:**
```typescript
// ✅ BIEN - Usa useMemo
function AgentsList({ agents }) {
  const sortedAgents = useMemo(() => {
    return agents
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(agent => ({
        ...agent,
        displayName: `${agent.name} (${agent.status})`,
      }))
      .filter(agent => agent.status === 'ACTIVE');
  }, [agents]);
  
  return <div>{/* ... */}</div>;
}
```

---

### RF-07: Code Splitting Más Agresivo

**Descripción:** Separar código pesado en chunks independientes.

**Estrategias:**
- Separar librerías pesadas (charts, editors, etc.)
- Separar rutas en chunks independientes
- Preload de chunks críticos

**Implementación:**
```typescript
// En next.config.js
module.exports = {
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
          },
          charts: {
            test: /[\\/]node_modules[\\/](recharts|chart\.js|d3)[\\/]/,
            name: 'charts',
            priority: 20,
          },
        },
      },
    };
    return config;
  },
};
```

---

## Requisitos Técnicos

### RT-01: Mejora de Instrumentación

**Archivo:** `apps/web/lib/perf/client-perf.ts`

**Modificaciones:**
- Agregar stack traces a long tasks
- Agregar información de componente que causó el long task
- Agregar información de ruta actual

---

### RT-02: React.memo() en Componentes

**Archivos:** Múltiples componentes en `apps/web/components/`

**Componentes prioritarios:**
- Listas (agents, appointments, conversations)
- Formularios complejos
- Componentes con muchos props

---

### RT-03: Lazy Loading

**Archivos:** Múltiples páginas y componentes

**Componentes candidatos:**
- Calendarios
- Editores
- Gráficos
- Modales complejos

---

### RT-04: Virtualización

**Archivos:** Componentes de lista

**Librería:** `@tanstack/react-virtual` (o similar)

**Componentes:**
- AgentsList
- ConversationsList
- MessagesList
- AppointmentsList

---

### RT-05: Optimización de Efectos

**Archivos:** Todos los componentes con useEffect/useMemo/useCallback

**Acciones:**
- Revisar dependencias
- Optimizar cálculos pesados
- Evitar efectos innecesarios

---

## Criterios de Aceptación

### CA-01: Reducción de Long Tasks

- ✅ Long tasks > 100ms eliminados
- ✅ Long tasks 50-100ms reducidos a < 50ms cuando sea posible
- ✅ Sin regresiones en funcionalidad

### CA-02: Re-renders Optimizados

- ✅ Componentes pesados usan React.memo()
- ✅ Re-renders innecesarios eliminados
- ✅ Verificado con React DevTools Profiler

### CA-03: Lazy Loading Implementado

- ✅ Componentes pesados cargados de forma diferida
- ✅ Loading states apropiados
- ✅ Sin regresiones en UX

### CA-04: Virtualización Funcionando

- ✅ Listas grandes usan virtualización
- ✅ Scroll fluido
- ✅ Rendimiento mejorado con 100+ items

---

## Métricas de Éxito

### Antes (Baseline)

| Métrica | Valor |
|---------|-------|
| Long tasks > 100ms | 2-3 por sesión |
| Long tasks 50-100ms | 3-5 por sesión |
| Re-renders innecesarios | Múltiples por navegación |
| Tiempo de render inicial | Variable |

### Después (Objetivo)

| Métrica | Valor Objetivo | Mejora |
|---------|----------------|--------|
| Long tasks > 100ms | 0 | ✅ 100% eliminados |
| Long tasks 50-100ms | < 2 por sesión | ✅ 60% reducción |
| Re-renders innecesarios | Mínimos | ✅ 80% reducción |
| Tiempo de render inicial | < 200ms | ✅ Mejora |

---

## Priorización

### Fase 1: Componentes Críticos (ALTA)
1. AppLayout (verificar re-renders)
2. AgentsList
3. ConversationsList
4. AppointmentsList

### Fase 2: Componentes Pesados (MEDIA)
1. Calendarios
2. Formularios complejos
3. Gráficos y visualizaciones

### Fase 3: Optimizaciones Generales (BAJA)
1. Otros componentes de lista
2. Efectos optimizados
3. Code splitting

---

## Riesgos y Mitigaciones

### Riesgo 1: React.memo() causa bugs por comparación incorrecta
**Mitigación:** Tests antes/después, comparación personalizada cuando sea necesario

### Riesgo 2: Lazy loading causa layout shift
**Mitigación:** Usar skeleton screens, reservar espacio

### Riesgo 3: Virtualización rompe funcionalidad existente
**Mitigación:** Implementar gradualmente, tests exhaustivos

---

## Dependencias

- ✅ Fix #1 (Deduplicación de Requests) - COMPLETADO
- ⏳ Instrumentación de performance - COMPLETADO
- ⏳ React DevTools Profiler

---

## Referencias

- `IA-Specs/05-frontend-standards.mdc` - Estándares de frontend
- `docs/perf-findings.md` - Análisis de rendimiento
- `docs/perf-results-final.md` - Resultados del Fix #1
- React Performance: https://react.dev/learn/render-and-commit
- React.memo: https://react.dev/reference/react/memo
- Virtualización: https://tanstack.com/virtual/latest

---

## Notas

- Este PRD se enfoca en optimizaciones incrementales, no refactor masivo
- Todos los cambios deben ser medibles (antes/después)
- Mantener compatibilidad con código existente
- Documentar todas las optimizaciones aplicadas
- Long tasks en desarrollo pueden ser por hot reload (normal)
