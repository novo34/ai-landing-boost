# PRD-SEC-0003: Re-habilitación del Middleware de Seguridad Next.js

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Prioridad:** P1 (Security)  
**Estado:** Pendiente de Implementación

---

## 1. Problema y Contexto

### 1.1 Hallazgo de Auditoría (H2)
El middleware de seguridad de Next.js (`apps/web/middleware.ts`, líneas 10-101) está completamente deshabilitado:

1. **Middleware comentado:** Todo el código de seguridad está dentro de comentarios
2. **Matcher vacío:** El `config.matcher` está vacío, por lo que el middleware no se ejecuta en ninguna ruta
3. **Retorno inmediato:** La función solo retorna `NextResponse.next()` sin validaciones

### 1.2 Estado Actual
- **Archivo:** `apps/web/middleware.ts`
- **Líneas comentadas:** 21-90 (todo el código de seguridad)
- **Matcher:** Vacío (línea 99: `matcher: []`)
- **Funcionalidad:** Ninguna, solo pasa requests sin validación

### 1.3 Impacto de Seguridad
- **P1 - Alto:** Aplicación expuesta públicamente (ngrok) sin autenticación básica
- **P1 - Alto:** Sin lista blanca de IPs, cualquier IP puede acceder
- **P2 - Medio:** Headers de seguridad no se aplican en desarrollo/ngrok
- **P2 - Medio:** Sin diferenciación entre entornos (dev vs prod)

### 1.4 Razón del Deshabilitado
Según comentarios en el código, el middleware fue deshabilitado temporalmente para diagnóstico de rendimiento (ver `DIAGNOSTICO-LENTITUD.md`). El diagnóstico ya completó, pero el middleware no fue restaurado.

---

## 2. Objetivos

### 2.1 Objetivos Principales
1. **Restaurar middleware de seguridad** con todas las validaciones
2. **Activar matcher correctamente** para aplicar a rutas necesarias
3. **Optimizar performance** para evitar problemas de lentitud
4. **Configurar autenticación básica** para ngrok (si está configurada)
5. **Configurar lista blanca de IPs** para ngrok (si está configurada)

### 2.2 NO-Objetivos
- ❌ Cambiar la lógica de seguridad existente (solo restaurar)
- ❌ Agregar nuevas validaciones de seguridad (fuera de alcance)
- ❌ Modificar comportamiento de producción (solo afecta ngrok/dev)
- ❌ Cambiar configuración de CORS (manejado en backend)

---

## 3. Usuarios y Actores Afectados

### 3.1 Usuarios Finales
- **Impacto:** Ninguno en producción. Solo afecta acceso vía ngrok en desarrollo
- **Mejora:** Mayor seguridad en entornos de desarrollo expuestos

### 3.2 Desarrolladores
- **Impacto:** Deben configurar `NGROK_AUTH_USER` y `NGROK_AUTH_PASS` si usan ngrok
- **Acción requerida:** Actualizar `.env.local` con credenciales si es necesario

### 3.3 DevOps/Infraestructura
- **Impacto:** Deben asegurar que variables de entorno estén configuradas
- **Acción requerida:** Documentar variables opcionales para ngrok

---

## 4. Requisitos Funcionales (FR)

### FR-001: Restaurar Código del Middleware
**Descripción:** Descomentar y restaurar todo el código de seguridad

**Criterios:**
- Descomentar líneas 21-90
- Eliminar comentarios temporales de diagnóstico
- Mantener lógica original sin cambios

### FR-002: Activar Matcher Correctamente
**Descripción:** Configurar `config.matcher` para aplicar a rutas necesarias

**Criterios:**
- Matcher debe aplicar a todas las rutas excepto:
  - `/api/*` (manejado por backend)
  - `/_next/static/*` (assets estáticos)
  - `/_next/image/*` (optimización de imágenes)
  - `/favicon.ico` (favicon)
- Patrón: `'/((?!api|_next/static|_next/image|favicon.ico).*)'`

### FR-003: Autenticación Básica para ngrok
**Descripción:** Si `NGROK_AUTH_USER` y `NGROK_AUTH_PASS` están configurados, aplicar Basic Auth

**Criterios:**
- Solo aplicar si hostname contiene "ngrok"
- Verificar header `Authorization: Basic <credentials>`
- Si no está presente, retornar 401 con header `WWW-Authenticate`
- Si credenciales son incorrectas, retornar 401

### FR-004: Lista Blanca de IPs para ngrok
**Descripción:** Si `NGROK_ALLOWED_IPS` está configurado, validar IP del cliente

**Criterios:**
- Solo aplicar si hostname contiene "ngrok"
- Leer IP del cliente desde headers (`x-forwarded-for`, `x-real-ip`, `request.ip`)
- Si IP no está en lista y no es `*`, retornar 403
- Si `*` está en lista, permitir todas las IPs

### FR-005: Headers de Seguridad
**Descripción:** Agregar headers de seguridad según entorno

**Criterios:**
- Para ngrok: `X-Environment: development-ngrok`, `X-Security-Warning: ...`
- Para producción: `X-Environment: production`
- Headers deben agregarse sin afectar otros headers existentes

### FR-006: Optimización de Performance
**Descripción:** Asegurar que middleware no cause lentitud

**Criterios:**
- Validaciones deben ser rápidas (< 10ms por request)
- Cachear validaciones cuando sea posible (hostname, IPs permitidas)
- Evitar operaciones síncronas costosas
- Medir latencia y optimizar si excede umbral

---

## 5. Requisitos No Funcionales (NFR)

### NFR-001: Performance
- **Latencia:** Middleware no debe agregar más de 10ms por request
- **Throughput:** No debe afectar capacidad de la aplicación
- **Optimización:** Validaciones deben ser O(1) cuando sea posible

### NFR-002: Seguridad
- **Autenticación:** Basic Auth debe usar HTTPS en producción (ngrok lo proporciona)
- **IPs:** Lista blanca debe validarse correctamente considerando proxies

### NFR-003: Compatibilidad
- **Backward:** No debe romper funcionalidad existente
- **Frontend:** No debe afectar rutas de API o assets estáticos

---

## 6. Riesgos y Mitigaciones

### R-001: Performance Degradado
**Riesgo:** Middleware puede causar lentitud como antes  
**Mitigación:**
- Optimizar validaciones (cachear hostname, IPs)
- Medir latencia antes y después
- Si persiste problema, considerar mover validaciones a nivel de servidor

### R-002: Credenciales No Configuradas
**Riesgo:** Si ngrok está activo pero no hay credenciales, acceso abierto  
**Mitigación:**
- Documentar claramente que credenciales son opcionales
- Advertir en logs si ngrok detectado sin credenciales
- Considerar requerir credenciales si ngrok está activo (opcional)

### R-003: IPs Incorrectas
**Riesgo:** Lista blanca puede bloquear IPs legítimas  
**Mitigación:**
- Validar correctamente headers de proxy (`x-forwarded-for`)
- Permitir `*` para desarrollo
- Documentar formato de `NGROK_ALLOWED_IPS`

---

## 7. Telemetría y Observabilidad

### 7.1 Logs Esperados
- **INFO:** "Middleware de seguridad aplicado para hostname: {hostname}"
- **WARN:** "Intento de acceso sin autenticación a ngrok desde IP: {ip}"
- **WARN:** "IP no autorizada intentando acceder: {ip}"
- **WARN:** "ngrok detectado pero NGROK_AUTH_USER no configurado"

### 7.2 Métricas
- **Contador:** `middleware.requests.total` (por tipo: ngrok, local, prod)
- **Contador:** `middleware.auth.failed` (intentos fallidos de Basic Auth)
- **Contador:** `middleware.ip.blocked` (IPs bloqueadas)
- **Histograma:** `middleware.latency` (tiempo de ejecución del middleware)

---

## 8. Criterios de Aceptación

### CA-001: Middleware Restaurado
**Given:** El middleware está comentado y deshabilitado  
**When:** Se restaura el código  
**Then:**
- Todo el código de seguridad está descomentado
- El matcher está configurado correctamente
- El middleware se ejecuta en rutas esperadas

### CA-002: Matcher Aplica Correctamente
**Given:** El matcher está configurado  
**When:** Se hace request a diferentes rutas  
**Then:**
- Middleware se ejecuta en `/` y rutas de páginas
- Middleware NO se ejecuta en `/api/*`
- Middleware NO se ejecuta en `/_next/static/*`
- Middleware NO se ejecuta en `/_next/image/*`
- Middleware NO se ejecuta en `/favicon.ico`

### CA-003: Autenticación Básica Funciona
**Given:** `NGROK_AUTH_USER` y `NGROK_AUTH_PASS` están configurados  
**When:** Se accede vía ngrok sin credenciales  
**Then:**
- Se retorna 401 con header `WWW-Authenticate: Basic`
- Con credenciales correctas, se permite acceso
- Con credenciales incorrectas, se retorna 401

### CA-004: Lista Blanca de IPs Funciona
**Given:** `NGROK_ALLOWED_IPS` está configurado  
**When:** Se accede vía ngrok desde IP no autorizada  
**Then:**
- Se retorna 403 "Acceso denegado - IP no autorizada"
- Desde IP autorizada, se permite acceso
- Si `*` está en lista, todas las IPs son permitidas

### CA-005: Headers de Seguridad Agregados
**Given:** El middleware se ejecuta  
**When:** Se procesa un request  
**Then:**
- Para ngrok: `X-Environment: development-ngrok` y `X-Security-Warning` están presentes
- Para producción: `X-Environment: production` está presente
- Headers no afectan funcionalidad existente

### CA-006: Performance Aceptable
**Given:** El middleware está activo  
**When:** Se mide latencia de requests  
**Then:**
- Latencia agregada por middleware < 10ms (p95)
- No hay degradación significativa en tiempo de carga de páginas
- Throughput de la aplicación se mantiene

---

## 9. Definición de "Done"

### Checklist de Completitud
- [ ] Código del middleware descomentado y restaurado
- [ ] Matcher configurado correctamente
- [ ] Autenticación básica funciona para ngrok
- [ ] Lista blanca de IPs funciona para ngrok
- [ ] Headers de seguridad agregados correctamente
- [ ] Performance medida y aceptable (< 10ms)
- [ ] Tests de middleware pasando
- [ ] Documentación actualizada (env vars)
- [ ] Validación en entorno de desarrollo
- [ ] Logs de auditoría funcionando

---

## 10. Dependencias y Orden de Implementación

### 10.1 Dependencias
- **H3 (PRD-SEC-0001):** Debe completarse primero (unificar gestor de paquetes)
- **H1 (PRD-SEC-0002):** Debe completarse antes (hardening de refresh tokens)
- **Next.js:** Debe estar configurado correctamente

### 10.2 Orden de Implementación
1. **H3:** Unificar gestor de paquetes (pnpm)
2. **H1:** Hardening de refresh tokens
3. **H2 (este PRD):** Re-habilitar middleware de seguridad

### 10.3 Bloqueadores
- Ninguno después de H1 y H3

---

## 11. Referencias

- **Hallazgo de Auditoría:** H2 (P1)
- **Archivos Afectados:**
  - `apps/web/middleware.ts` - RESTAURAR código comentado
  - `apps/web/.env.local` o `.env` - CONFIGURAR variables opcionales
  - `apps/web/README.md` - ACTUALIZAR documentación

---

## 12. Aprobaciones

- [ ] **Staff Engineer:** _________________ Fecha: _______
- [ ] **Security Lead:** _________________ Fecha: _______
- [ ] **Frontend Lead:** _________________ Fecha: _______

---

**Fin del PRD**

