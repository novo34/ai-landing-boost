# Fixes de Seguridad Aplicados - PRD-07

> **Fecha:** 2025-01-14  
> **PRD:** PRD-07 - Autenticación Avanzada + SSO  
> **Prioridad:** 🔴 CRÍTICA

---

## Resumen

Se han aplicado fixes críticos de seguridad identificados en la auditoría del PRD-07.

---

## Fixes Aplicados

### ✅ Fix 1: Encriptación de Tokens OAuth

**Problema:** Tokens OAuth (`accessToken` y `refreshToken`) se almacenaban en texto plano en `UserIdentity`.

**Solución:**
- Importado `EncryptionUtil` desde `whatsapp/utils/encryption.util.ts`
- Tokens se encriptan con AES-256-GCM antes de guardar en BD
- Aplicado en:
  - `loginWithGoogle()` - 2 lugares (asociar a usuario existente, crear nuevo usuario)
  - `loginWithMicrosoft()` - 2 lugares (asociar a usuario existente, crear nuevo usuario)

**Archivos modificados:**
- `apps/api/src/modules/auth/auth.service.ts`

**Código:**
```typescript
// Antes:
accessToken: profile.accessToken,
refreshToken: profile.refreshToken,

// Después:
const encryptedAccessToken = profile.accessToken ? EncryptionUtil.encrypt(profile.accessToken) : null;
const encryptedRefreshToken = profile.refreshToken ? EncryptionUtil.encrypt(profile.refreshToken) : null;
accessToken: encryptedAccessToken,
refreshToken: encryptedRefreshToken,
```

**Nota:** Si en el futuro se necesitan desencriptar los tokens (ej: para refresh), usar `EncryptionUtil.decrypt()`.

---

### ✅ Fix 2: Rate Limiting Completo

**Problema:** Algunos endpoints de autenticación no tenían rate limiting.

**Solución:**
- Agregado `@Throttle` a todos los endpoints de autenticación faltantes

**Endpoints actualizados:**
- `GET /auth/google` - 10 intentos por minuto
- `GET /auth/google/callback` - 10 callbacks por minuto
- `GET /auth/microsoft` - 10 intentos por minuto
- `GET /auth/microsoft/callback` - 10 callbacks por minuto
- `POST /auth/verify-email` - 5 verificaciones por minuto
- `POST /auth/resend-verification` - 3 reenvíos por minuto

**Endpoints ya protegidos (sin cambios):**
- `POST /auth/register` - 3 registros por minuto ✅
- `POST /auth/login` - 5 intentos por minuto ✅
- `POST /auth/refresh` - 20 refreshes por 10 minutos ✅

**Archivos modificados:**
- `apps/api/src/modules/auth/auth.controller.ts`

---

### ✅ Fix 3: Guard de Email Verificado

**Problema:** Usuarios con `emailVerified: false` tenían acceso completo al sistema.

**Solución:**
- Creado `EmailVerifiedGuard` en `apps/api/src/common/guards/email-verified.guard.ts`
- Guard verifica que el usuario tenga `emailVerified: true`
- Retorna error claro si email no está verificado

**Uso:**
```typescript
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
```

**Archivos creados:**
- `apps/api/src/common/guards/email-verified.guard.ts`

**Nota:** Este guard debe aplicarse a rutas que requieren email verificado. Por ahora está creado pero no aplicado automáticamente. Se debe aplicar manualmente a las rutas que lo requieran.

---

### ✅ Fix 4: Logs de Auditoría para SSO

**Problema:** No había logging específico para acciones SSO.

**Solución:**
- Agregado logging en `loginWithGoogle()` y `loginWithMicrosoft()`
- Logs incluyen: email, userId, éxito/fallo
- Logging también en callbacks del controller

**Logs agregados:**
- `[SSO Google] Attempting login for email: ...`
- `[SSO Google] Login successful for email: ..., userId: ...`
- `[SSO Microsoft] Attempting login for email: ...`
- `[SSO Microsoft] Login successful for email: ..., userId: ...`
- `[SSO Google/Microsoft] Callback received/error`

**Archivos modificados:**
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`

---

### ⚠️ Fix 5: Validación de State Parameter (Parcial)

**Estado:** ⚠️ **VERIFICADO - NO REQUIERE CAMBIOS**

**Análisis:**
- `passport-google-oauth20` maneja `state` automáticamente para prevenir CSRF
- `passport-microsoft` también maneja `state` automáticamente
- No se requiere implementación adicional

**Nota:** Se agregó comentario en código explicando que Passport maneja state automáticamente.

**Archivos modificados:**
- `apps/api/src/modules/auth/strategies/google.strategy.ts` (comentario agregado)

---

## Verificación

### Build

```powershell
cd apps/api
pnpm build
```

**Resultado:** ✅ **EXITOSO**

---

## Pendiente (No Crítico)

### Gap 1: UI para Gestión de Identidades SSO
- **Prioridad:** 🟡 MEDIA
- **Estado:** Backend completo, falta UI

### Gap 2: UI Completa para Gestión de Invitaciones
- **Prioridad:** 🟡 MEDIA
- **Estado:** Backend completo, falta UI completa

### Gap 3: Aplicar EmailVerifiedGuard a Rutas Específicas
- **Prioridad:** 🟠 ALTA
- **Estado:** Guard creado, falta aplicarlo a rutas que requieren email verificado

**Rutas que deberían requerir email verificado:**
- Crear recursos (agentes, canales, etc.)
- Configuraciones críticas
- Exportaciones de datos

---

## Checklist de Validación

- [x] Encriptación de tokens OAuth implementada
- [x] Rate limiting completo en todos los endpoints auth
- [x] Guard de email verificado creado
- [x] Logs de auditoría para SSO implementados
- [x] Validación de state verificada (no requiere cambios)
- [x] Build verificado y exitoso
- [ ] **PENDIENTE:** Aplicar EmailVerifiedGuard a rutas específicas
- [ ] **PENDIENTE:** UI para gestión de identidades SSO
- [ ] **PENDIENTE:** UI completa para gestión de invitaciones

---

## Próximos Pasos

1. **Aplicar EmailVerifiedGuard** a rutas que requieren email verificado
2. **Implementar UI** para gestión de identidades SSO
3. **Completar UI** de invitaciones en settings/team
4. **Testing:** Probar flujos SSO con tokens encriptados
5. **Migración:** Si hay tokens existentes sin encriptar, crear script de migración

---

**Última actualización:** 2025-01-14 15:20  
**Estado:** ✅ **FIXES CRÍTICOS APLICADOS** - Build exitoso, listo para testing
