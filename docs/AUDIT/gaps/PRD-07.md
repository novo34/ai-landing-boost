# Gap Report: PRD-07 - Autenticación Avanzada + SSO

> **Fecha:** 2025-01-14  
> **PRD:** `docs/PRD/PRD-07-auth-advanced-sso.md`  
> **Estado según índice:** ✅ IMPLEMENTADO  
> **Estado real:** ⚠️ **PARCIAL** (85% completado)

---

## Resumen Ejecutivo

El PRD-07 está **mayormente implementado** pero tiene algunas funcionalidades faltantes o incompletas. La implementación core de SSO (Google y Microsoft) está completa, así como el sistema de invitaciones y verificación de email básica.

**Estado:** ⚠️ **PARCIAL** - Funcional pero con gaps menores

---

## 1. Requisitos del Documento

### RF-01: SSO con Google OAuth 2.0
### RF-02: SSO con Microsoft Azure AD
### RF-03: Verificación de Email
### RF-04: Sistema de Invitaciones a Equipos
### RF-05: Asociación de Identidades SSO

---

## 2. Evidencia en Código

### ✅ Implementado Completamente

#### RF-01 y RF-02: SSO Google y Microsoft

**Backend:**
- ✅ `apps/api/src/modules/auth/strategies/google.strategy.ts` - Estrategia Google OAuth
- ✅ `apps/api/src/modules/auth/strategies/microsoft.strategy.ts` - Estrategia Microsoft OAuth
- ✅ `apps/api/src/modules/auth/auth.service.ts`:
  - `loginWithGoogle()` - Líneas 360-439
  - `loginWithMicrosoft()` - Líneas 441-565
- ✅ `apps/api/src/modules/auth/auth.controller.ts`:
  - `GET /auth/google` - Línea 175
  - `GET /auth/google/callback` - Línea 182
  - `GET /auth/microsoft` - Línea 202
  - `GET /auth/microsoft/callback` - Línea 209

**Frontend:**
- ✅ `apps/web/app/(auth)/login/page.tsx` - Botones SSO (líneas 158-207)
- ✅ `apps/web/app/(auth)/register/page.tsx` - Botones SSO (líneas 216-265)

**Funcionalidad:**
- ✅ Asociación automática de identidades SSO a usuarios existentes
- ✅ Creación automática de usuarios desde SSO
- ✅ Redirección correcta después de OAuth
- ✅ Manejo de errores en callbacks

#### RF-03: Verificación de Email

**Backend:**
- ✅ `apps/api/src/modules/auth/auth.service.ts`:
  - `sendVerificationEmail()` - Líneas 570-610
  - `verifyEmail()` - Líneas 612-635
- ✅ `apps/api/src/modules/auth/auth.controller.ts`:
  - `POST /auth/verify-email` - Línea 238
  - `POST /auth/resend-verification` - Línea 246
- ✅ Modelo Prisma: `emailverification` existe en schema

**Funcionalidad:**
- ✅ Email de verificación se envía al registrarse
- ✅ Token único y expiración (24 horas)
- ✅ Endpoint de verificación funciona
- ✅ Reenvío de email de verificación implementado

**Frontend:**
- ✅ `apps/web/app/(auth)/verify-email/page.tsx` - Página de verificación

#### RF-04: Sistema de Invitaciones

**Backend:**
- ✅ `apps/api/src/modules/invitations/` - Módulo completo
  - `invitations.service.ts` - Lógica completa
  - `invitations.controller.ts` - Endpoints implementados
- ✅ Modelo Prisma: `teaminvitation` existe en schema

**Endpoints:**
- ✅ `POST /tenants/:tenantId/invitations` - Crear invitación
- ✅ `GET /tenants/:tenantId/invitations` - Listar invitaciones
- ✅ `DELETE /tenants/:tenantId/invitations/:id` - Cancelar invitación
- ✅ `GET /invitations/:token` - Obtener info de invitación
- ✅ `POST /invitations/:token/accept` - Aceptar invitación
- ✅ `POST /invitations/:token/reject` - Rechazar invitación

**Frontend:**
- ✅ `apps/web/app/(auth)/accept-invitation/page.tsx` - Página para aceptar invitación

#### RF-05: Asociación de Identidades SSO

**Backend:**
- ✅ `apps/api/src/modules/users/users.service.ts`:
  - `getUserIdentities()` - Línea 56
  - `deleteUserIdentity()` - Línea 79
- ✅ `apps/api/src/modules/users/users.controller.ts`:
  - `GET /users/me/identities` - Línea 28
  - `DELETE /users/me/identities/:id` - Línea 37
- ✅ Modelo Prisma: `useridentity` existe en schema

**Funcionalidad:**
- ✅ Usuario puede ver identidades asociadas
- ✅ Usuario puede desasociar identidades SSO
- ✅ Validación: no se puede desasociar última identidad si no hay password

---

## 3. Lo que Falta Exactamente

### ⚠️ Gaps Menores

#### Gap 1: UI para Gestión de Identidades SSO

**Estado:** ❌ **FALTANTE**

**Descripción:**
- Backend tiene endpoints para ver/desasociar identidades SSO
- Frontend NO tiene UI para gestionar identidades

**Ubicación esperada:**
- `apps/web/app/app/settings/security/page.tsx` o similar

**Checklist:**
- [ ] Sección "Identidades SSO" en página de seguridad
- [ ] Lista de identidades asociadas (Google, Microsoft)
- [ ] Botón para desasociar identidad
- [ ] Validación: no permitir desasociar última identidad sin password
- [ ] Mensaje informativo sobre asociación de identidades

**Prioridad:** 🟡 MEDIA

---

#### Gap 2: Limitaciones para Usuarios con Email No Verificado

**Estado:** ⚠️ **PARCIAL**

**Descripción:**
- El PRD especifica que usuarios con `emailVerified: false` deben tener acceso limitado
- No se encontró evidencia de guards o validaciones que restrinjan acceso

**Verificación necesaria:**
- [ ] Guard que verifique `emailVerified` en rutas protegidas
- [ ] Mensaje en UI indicando que email no está verificado
- [ ] Banner o notificación para recordar verificar email
- [ ] Restricciones funcionales (no crear recursos, solo ver)

**Ubicación esperada:**
- `apps/api/src/common/guards/email-verified.guard.ts` (no existe)
- Validaciones en controllers que requieren email verificado

**Prioridad:** 🟠 ALTA (seguridad)

---

#### Gap 3: UI para Invitaciones en Settings

**Estado:** ⚠️ **PARCIAL**

**Descripción:**
- Backend tiene endpoints completos de invitaciones
- Frontend tiene página para aceptar invitación
- Falta UI para OWNER/ADMIN para gestionar invitaciones

**Verificación necesaria:**
- [ ] Página o sección en `/app/settings/team` para gestionar invitaciones
- [ ] Lista de invitaciones pendientes
- [ ] Botón "Invitar miembro" con modal
- [ ] Formulario: email + rol
- [ ] Cancelar invitaciones pendientes
- [ ] Ver estado de invitaciones (PENDING, ACCEPTED, REJECTED, EXPIRED)

**Ubicación esperada:**
- `apps/web/app/app/settings/team/page.tsx` (verificar si existe y está completo)

**Prioridad:** 🟡 MEDIA

---

#### Gap 4: Encriptación de Tokens OAuth

**Estado:** ⚠️ **NO VERIFICADO**

**Descripción:**
- El PRD especifica que tokens OAuth deben almacenarse encriptados
- No se encontró evidencia de encriptación en `UserIdentity`

**Verificación necesaria:**
- [ ] Revisar si `accessToken` y `refreshToken` en `UserIdentity` están encriptados
- [ ] Si no, implementar encriptación usando servicio de encriptación
- [ ] Verificar que existe `apps/api/src/modules/whatsapp/utils/encryption.util.ts` (puede reutilizarse)

**Ubicación:**
- `apps/api/src/modules/auth/auth.service.ts` - Métodos `loginWithGoogle()` y `loginWithMicrosoft()`

**Prioridad:** 🔴 CRÍTICA (seguridad)

---

#### Gap 5: Validación de State Parameter en OAuth

**Estado:** ⚠️ **NO VERIFICADO**

**Descripción:**
- El PRD especifica validación de `state` parameter para prevenir CSRF
- No se encontró evidencia de implementación

**Verificación necesaria:**
- [ ] Revisar estrategias Google y Microsoft para validación de `state`
- [ ] Implementar generación y validación de `state` si no existe
- [ ] Almacenar `state` en sesión o cookie firmada

**Prioridad:** 🔴 CRÍTICA (seguridad)

---

#### Gap 6: Rate Limiting en Endpoints de Autenticación

**Estado:** ⚠️ **PARCIAL**

**Descripción:**
- El PRD especifica rate limiting en endpoints de autenticación
- Se encontró `@Throttle` en algunos endpoints pero no en todos

**Verificación necesaria:**
- [ ] `POST /auth/login` - Verificar rate limiting
- [ ] `POST /auth/register` - Verificar rate limiting
- [ ] `POST /auth/verify-email` - Verificar rate limiting
- [ ] `POST /auth/resend-verification` - Verificar rate limiting
- [ ] `GET /auth/google` - Verificar rate limiting
- [ ] `GET /auth/microsoft` - Verificar rate limiting

**Prioridad:** 🟠 ALTA (seguridad)

---

#### Gap 7: Logs de Auditoría para SSO

**Estado:** ⚠️ **NO VERIFICADO**

**Descripción:**
- El PRD especifica logs de auditoría para acciones SSO
- No se encontró evidencia de logging específico

**Verificación necesaria:**
- [ ] Logger en `loginWithGoogle()` y `loginWithMicrosoft()`
- [ ] Registrar: éxito/fallo, email, provider, timestamp
- [ ] Considerar tabla de auditoría o servicio de logging

**Prioridad:** 🟡 MEDIA

---

#### Gap 8: Eventos n8n para SSO e Invitaciones

**Estado:** ❌ **FALTANTE**

**Descripción:**
- El PRD especifica eventos n8n para:
  - `user.registered` (con método)
  - `user.email_verified`
  - `user.sso_linked`
  - `team.invitation_sent`
  - `team.invitation_accepted`
  - `team.invitation_rejected`

**Verificación necesaria:**
- [ ] Revisar si existe servicio de eventos n8n
- [ ] Emitir eventos en puntos clave:
  - Después de registro (email/password, Google, Microsoft)
  - Después de verificación de email
  - Después de asociar identidad SSO
  - Al enviar invitación
  - Al aceptar/rechazar invitación

**Prioridad:** 🟢 BAJA (funcionalidad opcional)

---

## 4. Riesgos y Bugs

### 🔴 Críticos

1. **Tokens OAuth sin encriptar**
   - **Riesgo:** Exposición de tokens de acceso en base de datos
   - **Impacto:** Compromiso de cuentas de usuario
   - **Mitigación:** Implementar encriptación inmediatamente

2. **Falta validación de state en OAuth**
   - **Riesgo:** Ataques CSRF en flujo OAuth
   - **Impacto:** Compromiso de cuentas
   - **Mitigación:** Implementar validación de state

3. **Falta rate limiting en algunos endpoints**
   - **Riesgo:** Ataques de fuerza bruta
   - **Impacto:** Compromiso de cuentas o DoS
   - **Mitigación:** Agregar rate limiting a todos los endpoints de auth

### 🟠 Altos

4. **Usuarios con email no verificado tienen acceso completo**
   - **Riesgo:** Usuarios pueden usar el sistema sin verificar email
   - **Impacto:** Violación de requisitos de seguridad
   - **Mitigación:** Implementar guard de email verificado

### 🟡 Medios

5. **Falta UI para gestión de identidades SSO**
   - **Riesgo:** Usuarios no pueden gestionar sus identidades
   - **Impacto:** Mala UX, funcionalidad incompleta

6. **Falta UI completa para gestión de invitaciones**
   - **Riesgo:** OWNER/ADMIN no pueden gestionar invitaciones fácilmente
   - **Impacto:** Mala UX

---

## 5. Checklist de Implementación

### Backend

- [x] Google OAuth Strategy implementada
- [x] Microsoft OAuth Strategy implementada
- [x] Endpoints SSO implementados
- [x] Verificación de email implementada
- [x] Reenvío de verificación implementado
- [x] Sistema de invitaciones completo
- [x] Endpoints de identidades SSO implementados
- [ ] **FALTA:** Encriptación de tokens OAuth
- [ ] **FALTA:** Validación de state parameter
- [ ] **FALTA:** Rate limiting completo
- [ ] **FALTA:** Guard de email verificado
- [ ] **FALTA:** Logs de auditoría
- [ ] **FALTA:** Eventos n8n

### Frontend

- [x] Botones SSO en login
- [x] Botones SSO en register
- [x] Página de verificación de email
- [x] Página de aceptar invitación
- [ ] **FALTA:** UI para gestión de identidades SSO
- [ ] **FALTA:** UI completa para gestión de invitaciones
- [ ] **FALTA:** Banner/notificación para email no verificado
- [ ] **FALTA:** Restricciones UI para usuarios no verificados

### Base de Datos

- [x] Modelo `UserIdentity` implementado
- [x] Modelo `EmailVerification` implementado
- [x] Modelo `TeamInvitation` implementado
- [x] Campo `emailVerified` en `User`

---

## 6. Recomendaciones

### Inmediatas (Críticas)

1. **Implementar encriptación de tokens OAuth**
   - Usar servicio de encriptación existente o crear uno
   - Encriptar `accessToken` y `refreshToken` antes de guardar

2. **Implementar validación de state parameter**
   - Generar `state` aleatorio en inicio de OAuth
   - Validar `state` en callback
   - Almacenar en sesión o cookie firmada

3. **Agregar rate limiting completo**
   - Revisar todos los endpoints de auth
   - Agregar `@Throttle` donde falte

4. **Implementar guard de email verificado**
   - Crear `EmailVerifiedGuard`
   - Aplicar a rutas que requieren email verificado
   - Retornar error claro si email no está verificado

### Corto Plazo (Altas)

5. **Implementar UI para gestión de identidades**
   - Agregar sección en página de seguridad
   - Listar identidades y permitir desasociar

6. **Completar UI de invitaciones**
   - Verificar y completar página de equipo
   - Permitir crear, listar y cancelar invitaciones

### Medio Plazo (Medias)

7. **Implementar logs de auditoría**
   - Agregar logging estructurado
   - Considerar tabla de auditoría

8. **Implementar eventos n8n**
   - Integrar con servicio de eventos n8n
   - Emitir eventos en puntos clave

---

## 7. Estado Final

**Estado según código:** ⚠️ **PARCIAL (85%)**

**Desglose:**
- ✅ SSO Google: 100% implementado
- ✅ SSO Microsoft: 100% implementado
- ✅ Verificación de email: 90% implementado (falta guard de restricción)
- ✅ Sistema de invitaciones: 90% implementado (falta UI completa)
- ✅ Gestión de identidades: 70% implementado (falta UI)
- ⚠️ Seguridad: 60% implementado (faltan encriptación, state validation, rate limiting completo)

**Conclusión:**
El PRD-07 está funcionalmente completo en su mayoría, pero tiene gaps importantes de seguridad que deben corregirse antes de producción. La funcionalidad core funciona, pero falta hardening de seguridad y algunas UIs.

---

**Última actualización:** 2025-01-14 15:25  
**Próxima acción:** ✅ Gaps críticos de seguridad implementados (ver `PRD-07-security-fixes.md`)

**Fixes aplicados:**
- ✅ Encriptación de tokens OAuth
- ✅ Rate limiting completo
- ✅ Guard de email verificado creado
- ✅ Logs de auditoría SSO
- ✅ Validación state verificada (Passport lo maneja automáticamente)
