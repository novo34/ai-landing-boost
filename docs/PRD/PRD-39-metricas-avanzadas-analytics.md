# PRD-39: Métricas Avanzadas y Analytics

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Dashboard y Analytics  
> **Dependencias:** PRD-33

---

## Objetivo

Crear un dashboard completo de analytics con gráficos, métricas avanzadas y reportes exportables para que los usuarios puedan analizar el rendimiento de su negocio.

---

## Alcance INCLUIDO

- ✅ Dashboard de analytics con gráficos
- ✅ Métricas de conversaciones (por día/semana/mes)
- ✅ Métricas de mensajes (enviados vs recibidos)
- ✅ Tiempo promedio de respuesta por agente
- ✅ Conversiones de leads a citas
- ✅ Uso de agentes por canal
- ✅ Filtros por fecha, agente, canal
- ✅ Exportación de reportes (PDF, CSV)
- ✅ Comparativas históricas

---

## Alcance EXCLUIDO

- ❌ Análisis predictivo (queda para futuro)
- ❌ Machine Learning para insights (queda para futuro)
- ❌ Integración con Google Analytics (queda para futuro)
- ❌ Reportes programados automáticos (queda para PRD-42)

---

## Requisitos Funcionales

### RF-01: Dashboard de Analytics

**Descripción:** Página dedicada con múltiples gráficos y métricas.

**Gráficos:**
- Conversaciones por día (línea)
- Mensajes enviados vs recibidos (barras)
- Tiempo de respuesta por agente (barras horizontales)
- Conversiones leads → citas (funnel)
- Uso de agentes por canal (pie chart)
- Tendencias mensuales (área)

**Métricas:**
- Total de conversaciones en período
- Tasa de respuesta promedio
- Tasa de conversión (leads → citas)
- Satisfacción promedio (si se implementa feedback)

---

### RF-02: Filtros Avanzados

**Descripción:** Los usuarios deben poder filtrar métricas por múltiples criterios.

**Filtros:**
- Rango de fechas (desde/hasta)
- Agente específico o "Todos"
- Canal específico o "Todos"
- Tipo de conversación (si aplica)

**Comportamiento:**
- Filtros se aplican a todos los gráficos
- Persistir filtros en URL (query params)
- Botón "Reset" para limpiar filtros

---

### RF-03: Exportación de Reportes

**Descripción:** Los usuarios deben poder exportar reportes en diferentes formatos.

**Formatos:**
- PDF (reporte completo con gráficos)
- CSV (datos tabulares)
- Excel (opcional, futuro)

**Contenido:**
- Resumen ejecutivo
- Gráficos principales
- Tablas de datos detalladas
- Período y filtros aplicados

---

## Requisitos Técnicos

### RT-01: Endpoints API

```
GET /analytics/metrics?startDate=...&endDate=...&agentId=...&channelId=...
GET /analytics/conversations-trend?startDate=...&endDate=...&groupBy=day|week|month
GET /analytics/messages-stats?startDate=...&endDate=...
GET /analytics/response-times?startDate=...&endDate=...&agentId=...
GET /analytics/conversions?startDate=...&endDate=...
GET /analytics/export?format=pdf|csv&startDate=...&endDate=...
```

---

### RT-02: Librería de Gráficos

**Recomendación:** `recharts` o `chart.js` con `react-chartjs-2`

**Dependencias:**
```json
{
  "dependencies": {
    "recharts": "^2.10.0"
  }
}
```

---

## Flujos UX

### Flujo 1: Ver Analytics

```
[Usuario accede a /app/analytics]
  ↓
[Frontend carga datos con filtros por defecto (último mes)]
  ↓
[Backend calcula métricas]
  ↓
[Frontend renderiza gráficos]
  ↓
[Usuario cambia filtros]
  ↓
[Frontend recarga datos]
  ↓
[Gráficos se actualizan]
```

---

## Estructura de DB

No se requieren cambios. Se utilizan modelos existentes con agregaciones.

---

## Endpoints API

Ver RT-01.

---

## Eventos n8n

No se emiten eventos nuevos.

---

## Criterios de Aceptación

- [ ] Dashboard muestra todos los gráficos
- [ ] Filtros funcionan correctamente
- [ ] Gráficos se actualizan al cambiar filtros
- [ ] Exportación PDF funciona
- [ ] Exportación CSV funciona
- [ ] Métricas se calculan correctamente
- [ ] Performance aceptable (< 2s para cargar)

---

## Dependencias

- PRD-33: KPIs Reales (base de analytics)

---

**Última actualización:** 2025-01-XX

