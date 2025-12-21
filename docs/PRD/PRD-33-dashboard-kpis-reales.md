# PRD-33: KPIs Reales en Dashboard

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Dashboard y Analytics  
> **Dependencias:** PRD-12, PRD-18, PRD-30

---

## Objetivo

Reemplazar los KPIs hardcodeados (valores 0) en el dashboard principal con datos reales calculados desde la base de datos, proporcionando métricas actualizadas en tiempo real sobre el estado del tenant.

---

## Alcance INCLUIDO

- ✅ Endpoint API para obtener KPIs del dashboard
- ✅ Cálculo de métricas reales desde la base de datos
- ✅ Actualización de UI del dashboard con datos reales
- ✅ Indicadores de carga mientras se obtienen los datos
- ✅ Manejo de errores y estados vacíos
- ✅ Caché básico para optimizar rendimiento

---

## Alcance EXCLUIDO

- ❌ Gráficos avanzados (queda para PRD-34: Métricas Avanzadas)
- ❌ Comparativas históricas (queda para PRD-34)
- ❌ Exportación de reportes (queda para PRD-42)
- ❌ Filtros por fecha en KPIs (queda para PRD-34)
- ❌ Notificaciones automáticas (queda para PRD-34)

---

## Requisitos Funcionales

### RF-01: Endpoint de KPIs del Dashboard

**Descripción:** El sistema debe proporcionar un endpoint que devuelva los KPIs principales del tenant.

**KPIs a calcular:**
- Total de leads generados (desde `MarketingLead`)
- Total de agentes activos (desde `Agent` con status ACTIVE)
- Total de canales configurados (desde `Channel` con status ACTIVE)
- Total de conversaciones activas (desde `Conversation` con status ACTIVE)
- Total de mensajes procesados (desde `Message`, último mes)
- Tasa de respuesta promedio (tiempo promedio entre mensaje recibido y respuesta)
- Tiempo promedio de respuesta (en minutos/horas)

**Flujo:**
1. Usuario accede al dashboard (`/app`)
2. Frontend llama a `GET /analytics/kpis`
3. Backend calcula métricas desde BD
4. Backend devuelve datos en formato JSON
5. Frontend muestra KPIs actualizados

**Validaciones:**
- Solo usuarios autenticados pueden acceder
- Solo se calculan KPIs del tenant del usuario actual
- Si no hay datos, devolver 0 en lugar de null

---

### RF-02: Cálculo de Métricas

**Descripción:** El sistema debe calcular métricas de forma eficiente.

**Métricas a calcular:**

1. **Total de Leads:**
   - Contar registros en `MarketingLead` donde `tenantId` coincide
   - Incluir todos los estados (PENDING, CONTACTED, CONVERTED, LOST)

2. **Total de Agentes Activos:**
   - Contar `Agent` donde `tenantId` coincide y `status = 'ACTIVE'`

3. **Total de Canales Configurados:**
   - Contar `Channel` donde `tenantId` coincide y `status = 'ACTIVE'`

4. **Total de Conversaciones Activas:**
   - Contar `Conversation` donde `tenantId` coincide y `status = 'ACTIVE'`

5. **Total de Mensajes (Último Mes):**
   - Contar `Message` donde `conversation.tenantId` coincide
   - Filtrar por `createdAt >= inicio del mes actual`

6. **Tasa de Respuesta Promedio:**
   - Calcular tiempo promedio entre mensaje recibido y primera respuesta
   - Solo considerar mensajes con respuesta (no conversaciones sin respuesta)
   - Excluir mensajes del sistema

7. **Tiempo Promedio de Respuesta:**
   - Similar a tasa de respuesta, pero en formato legible (minutos/horas)

**Optimizaciones:**
- Usar agregaciones de Prisma para eficiencia
- Considerar caché Redis para KPIs (TTL: 5 minutos)
- Usar índices en BD para queries rápidas

---

### RF-03: Actualización de UI del Dashboard

**Descripción:** La UI del dashboard debe mostrar los KPIs reales con indicadores de carga.

**Componentes a modificar:**
- Reemplazar valores hardcodeados (0) con datos del API
- Mostrar skeleton/loading mientras se cargan datos
- Mostrar valores formateados (ej: 1,234 en lugar de 1234)
- Mostrar indicadores de tendencia si aplica (↑↓)
- Manejar estados de error gracefully

**UX:**
- Cargar KPIs en paralelo con otros datos del dashboard
- Mostrar error toast si falla la carga
- Permitir refresh manual de KPIs

---

## Requisitos Técnicos

### RT-01: Modelo de Datos

No se requieren cambios en el schema de Prisma. Se utilizan modelos existentes:
- `MarketingLead`
- `Agent`
- `Channel`
- `Conversation`
- `Message`

---

### RT-02: Endpoints API

```
GET /analytics/kpis
```

**Auth:** JWT + TenantContext + RBAC (todos los roles pueden ver)

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": {
      "total": 150,
      "thisMonth": 25
    },
    "agents": {
      "active": 5,
      "total": 8
    },
    "channels": {
      "active": 3,
      "total": 4
    },
    "conversations": {
      "active": 42,
      "total": 156
    },
    "messages": {
      "total": 1234,
      "thisMonth": 456
    },
    "responseRate": {
      "averageMinutes": 12.5,
      "averageHours": 0.21,
      "formatted": "12 min"
    },
    "responseTime": {
      "averageMinutes": 8.3,
      "formatted": "8 min"
    }
  }
}
```

---

### RT-03: Caché

**Implementación:**
- Usar Redis para caché de KPIs
- TTL: 5 minutos
- Key: `kpis:${tenantId}`
- Invalidar caché cuando:
  - Se crea/actualiza/elimina agente
  - Se crea/actualiza/elimina canal
  - Se crea/actualiza conversación
  - Se crea mensaje

---

## Flujos UX

### Flujo 1: Carga de Dashboard

```
[Usuario accede a /app]
  ↓
[Frontend muestra skeleton de KPIs]
  ↓
[Frontend llama a GET /analytics/kpis]
  ↓
[Backend calcula métricas desde BD]
  ↓
[Backend devuelve datos]
  ↓
[Frontend actualiza UI con valores reales]
```

---

## Estructura de DB

No se requieren cambios en la estructura de BD. Se utilizan modelos existentes.

---

## Endpoints API

Ver RT-02.

---

## Eventos n8n

No se emiten eventos nuevos. Los eventos existentes pueden usarse para invalidar caché.

---

## Criterios de Aceptación

- [ ] Endpoint `/analytics/kpis` devuelve datos correctos
- [ ] KPIs se calculan eficientemente (query < 500ms)
- [ ] UI muestra valores reales en lugar de 0
- [ ] Caché funciona correctamente
- [ ] Manejo de errores funciona
- [ ] Estados de carga se muestran correctamente
- [ ] Valores se formatean correctamente (1,234 en lugar de 1234)

---

## Dependencias

- PRD-12: Conversations/Messages (para contar conversaciones y mensajes)
- PRD-18: Agent Entity (para contar agentes)
- PRD-30: Channels System (para contar canales)
- Marketing Leads Module (para contar leads)

---

**Última actualización:** 2025-01-XX

