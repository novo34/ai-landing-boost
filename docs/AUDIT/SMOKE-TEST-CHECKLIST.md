# Checklist de Verificación Manual (Smoke Test)

> **Fecha:** 2025-01-27  
> **Auditor:** Principal Engineer + Release Manager  
> **Objetivo:** Verificar que todas las implementaciones funcionan correctamente

---

## ✅ Fase 1: Session/Auth Stabilization

### Verificaciones Backend

- [ ] Endpoint `/session/me` responde correctamente
- [ ] Cache funciona (segunda llamada debe ser más rápida)
- [ ] Endpoint `/auth/refresh` funciona correctamente

### Verificaciones Frontend

- [ ] Login funciona sin loops
- [ ] Navegación entre páginas no causa refresh storms
- [ ] No hay múltiples llamadas simultáneas a `/session/me` (verificar en DevTools Network)
- [ ] Banner de sesión expirada aparece cuando circuit breaker está abierto
- [ ] Logout controlado funciona sin loops
- [ ] React StrictMode no causa efectos duplicados (verificar en consola)

### Verificaciones Observabilidad

- [ ] Logs estructurados aparecen en consola (development)
- [ ] Métricas disponibles: `apiClient.getSessionMetrics()`
- [ ] Circuit breaker se puede verificar: `apiClient.isCircuitBreakerOpen()`

---

## ✅ Fase 2: PRD-49 Email Delivery

### Verificaciones Backend

- [ ] Endpoint `GET /settings/email` devuelve configuración SMTP
- [ ] Endpoint `PUT /settings/email` guarda configuración
- [ ] Endpoint `POST /settings/email/test` envía email de prueba
- [ ] Endpoint `GET /settings/email/logs` devuelve logs
- [ ] Endpoint `GET /platform/settings/email` devuelve configuración global
- [ ] Worker procesa emails en cola

### Verificaciones Frontend

- [ ] Página `/app/settings/email` carga correctamente
- [ ] Formulario SMTP se puede completar y guardar
- [ ] Botón "Enviar email de prueba" funciona
- [ ] Logs de emails se muestran correctamente
- [ ] Página `/platform/settings/email` carga correctamente (solo Platform Owner)

---

## ✅ Fase 3: PRD-33 a PRD-44

### PRD-33: KPIs Reales

- [ ] Dashboard `/app` muestra KPIs reales (no ceros)
- [ ] KPIs se actualizan correctamente

### PRD-34: Notificaciones Tiempo Real

- [ ] WebSocket se conecta correctamente
- [ ] Notificaciones aparecen en tiempo real
- [ ] Badge de notificaciones muestra contador correcto
- [ ] Centro de notificaciones funciona

### PRD-35: Búsqueda Global

- [ ] Barra de búsqueda aparece en header
- [ ] Búsqueda funciona en conversaciones, mensajes, citas, agentes, KB
- [ ] Resultados se muestran correctamente

### PRD-36: Vista Calendario

- [ ] Vista calendario funciona en `/app/appointments`
- [ ] Vistas mensual/semanal/diaria funcionan
- [ ] Citas se muestran correctamente en calendario

### PRD-37: Páginas Legales

- [ ] Páginas `/legal/terminos`, `/legal/privacidad`, `/legal/aviso-legal` existen
- [ ] Links en footer funcionan

### PRD-38: Personalización Logo/Colores

- [ ] Subida de logo funciona en settings
- [ ] Colores se aplican en dashboard
- [ ] Branding se aplica en sidebar

### PRD-39: Analytics Avanzadas

- [ ] Página `/app/analytics` carga correctamente
- [ ] Gráficos se muestran correctamente
- [ ] Filtros funcionan
- [ ] Exportación CSV funciona
- [ ] Exportación PDF funciona

### PRD-40: Branding Emails/Webchat

- [ ] Emails muestran logo del tenant
- [ ] Widget webchat muestra logo y colores del tenant

### PRD-41: Notificaciones Integraciones

- [ ] Notificaciones se emiten desde conversations, team, billing, appointments

### PRD-42: Storage Producción

- [ ] Storage service funciona (local/S3/Cloudinary según configuración)

### PRD-43: Exportación PDF

- [ ] Botón exportar PDF funciona en analytics

### PRD-44: Drag & Drop Calendario

- [ ] Arrastrar citas en calendario funciona
- [ ] Validación de disponibilidad funciona
- [ ] Confirmación antes de reprogramar funciona

---

## ⚠️ Fase 4: PRD-47/48 Perf

### PRD-47: Backend

- [ ] Endpoints críticos responden en <100ms
- [ ] Cache funciona en endpoints frecuentes
- [ ] No hay N+1 queries en logs

### PRD-48: Frontend

- [ ] Navegación es rápida (<50ms)
- [ ] No hay requests duplicados (verificar en DevTools)
- [ ] No hay errores 429
- [ ] Long tasks son mínimos (<50ms)

---

## 🚨 Verificaciones Críticas

### Session/Auth

- [ ] **NO hay loops de refresh** - Verificar en consola
- [ ] **NO hay múltiples llamadas a `/session/me`** - Verificar en Network tab
- [ ] **NO hay reloads inesperados** - Navegar entre páginas
- [ ] **Circuit breaker funciona** - Simular fallos de refresh

### Email Delivery

- [ ] **Configuración SMTP se guarda** - Probar guardar configuración
- [ ] **Email de prueba se envía** - Probar enviar email de prueba
- [ ] **Logs se muestran** - Verificar que logs aparecen

### Módulos Completados

- [ ] **Todos los módulos completados funcionan** - Navegar por cada módulo
- [ ] **No hay errores en consola** - Verificar consola del navegador
- [ ] **No hay errores en backend** - Verificar logs del backend

---

## 📝 Notas

- Todas las verificaciones deben hacerse en un entorno de desarrollo
- Verificar tanto en español como en inglés (i18n)
- Verificar con diferentes roles (OWNER, ADMIN, AGENT, VIEWER)
- Verificar multi-tenant (diferentes tenants)

---

**Última actualización:** 2025-01-27
