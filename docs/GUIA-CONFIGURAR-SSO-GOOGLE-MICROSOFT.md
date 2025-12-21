# Guía Completa: Configurar SSO con Google y Microsoft

> **Fecha:** 2025-01-27  
> **Objetivo:** Configurar autenticación OAuth 2.0 con Google y Microsoft

---

## 📋 Requisitos Previos

- Cuenta de Google (para Google OAuth)
- Cuenta de Microsoft/Azure (para Microsoft OAuth)
- Acceso a Google Cloud Console
- Acceso a Azure Portal
- URL de tu aplicación (local o producción)

---

## 🔵 PARTE 1: Configurar Google OAuth

### Paso 1: Crear Proyecto en Google Cloud Console

1. **Ir a Google Cloud Console:**
   - Visita: https://console.cloud.google.com/
   - Inicia sesión con tu cuenta de Google

2. **Crear un nuevo proyecto:**
   - Click en el selector de proyectos (arriba a la izquierda)
   - Click en "NUEVO PROYECTO"
   - Nombre: `AutomAI SSO` (o el que prefieras)
   - Click en "CREAR"

3. **Seleccionar el proyecto:**
   - Asegúrate de que el proyecto recién creado esté seleccionado

### Paso 2: Configurar Pantalla de Consentimiento OAuth

1. **Ir a "Pantalla de consentimiento OAuth":**
   - En el menú lateral, ve a: **APIs y servicios** → **Pantalla de consentimiento OAuth**

2. **Configurar la pantalla:**
   - **Tipo de usuario:** Selecciona "Externo" (o "Interno" si es solo para tu organización)
   - Click en "CREAR"

3. **Completar información de la aplicación:**
   - **Nombre de la aplicación:** `AutomAI` (o el nombre de tu app)
   - **Email de soporte:** Tu email
   - **Logo:** (Opcional) Sube un logo si tienes uno
   - **Dominio del desarrollador:** (Opcional)
   - Click en "GUARDAR Y CONTINUAR"

4. **Configurar Scopes (Alcances):**
   - Click en "AGREGAR O QUITAR ALCANCES"
   - Busca y selecciona:
     - `userinfo.email`
     - `userinfo.profile`
   - Click en "ACTUALIZAR" y luego "GUARDAR Y CONTINUAR"

5. **Usuarios de prueba (si es necesario):**
   - Si la app está en modo "Prueba", agrega usuarios de prueba
   - Click en "GUARDAR Y CONTINUAR"

6. **Revisar y volver al panel:**
   - Revisa la información
   - Click en "VOLVER AL PANEL"

### Paso 3: Crear Credenciales OAuth 2.0

1. **Ir a Credenciales:**
   - En el menú lateral: **APIs y servicios** → **Credenciales**

2. **Crear credenciales:**
   - Click en "CREAR CREDENCIALES" → "ID de cliente de OAuth 2.0"

3. **Configurar el ID de cliente:**
   - **Tipo de aplicación:** "Aplicación web"
   - **Nombre:** `AutomAI Web Client`

4. **Configurar URIs de redirección autorizados:**
   - **Para desarrollo local:**
     ```
     http://localhost:3001/auth/google/callback
     ```
   - **Para producción:**
     ```
     https://tu-dominio.com/auth/google/callback
     ```
   - Click en "AGREGAR URI" para cada una
   - ⚠️ **IMPORTANTE:** Agrega TODAS las URLs que vayas a usar

5. **Crear:**
   - Click en "CREAR"

6. **Copiar credenciales:**
   - Se mostrará un modal con:
     - **ID de cliente:** (ej: `123456789-abc123.apps.googleusercontent.com`)
     - **Secreto de cliente:** (ej: `GOCSPX-abc123xyz`)
   - ⚠️ **COPIA ESTOS VALORES** - los necesitarás después
   - Click en "LISTO"

### Paso 4: Habilitar Google+ API (si es necesario)

1. **Ir a Biblioteca de APIs:**
   - **APIs y servicios** → **Biblioteca**

2. **Buscar y habilitar:**
   - Busca "Google+ API" o "People API"
   - Click en "HABILITAR"

---

## 🔷 PARTE 2: Configurar Microsoft OAuth (Azure AD)

### Paso 1: Registrar Aplicación en Azure Portal

1. **Ir a Azure Portal:**
   - Visita: https://portal.azure.com/
   - Inicia sesión con tu cuenta de Microsoft/Azure

2. **Ir a Azure Active Directory:**
   - En el menú principal, busca "Azure Active Directory" o "Microsoft Entra ID"
   - Click en el servicio

3. **Registrar nueva aplicación:**
   - En el menú lateral: **Registros de aplicaciones**
   - Click en "Nuevo registro"

4. **Configurar el registro:**
   - **Nombre:** `AutomAI SSO`
   - **Tipos de cuenta admitidos:**
     - Para desarrollo: "Cuentas en cualquier directorio organizativo y cuentas Microsoft personales"
     - Para producción: Selecciona según tus necesidades
   - **URI de redirección:**
     - Plataforma: "Web"
     - URI: `http://localhost:3001/auth/microsoft/callback` (para desarrollo)
     - Click en "Registrar"

### Paso 2: Configurar URIs de Redirección

1. **Ir a Autenticación:**
   - En el menú lateral de tu aplicación: **Autenticación**

2. **Agregar URIs de redirección:**
   - En "URI de redirección", agrega:
     - Desarrollo: `http://localhost:3001/auth/microsoft/callback`
     - Producción: `https://tu-dominio.com/auth/microsoft/callback`
   - Click en "Guardar"

3. **Configurar permisos de API:**
   - En el menú lateral: **Permisos de API**
   - Click en "Agregar un permiso"
   - Selecciona "Microsoft Graph"
   - Selecciona "Permisos delegados"
   - Busca y selecciona:
     - `User.Read` (para leer perfil del usuario)
   - Click en "Agregar permisos"

### Paso 3: Crear Secreto de Cliente

1. **Ir a Certificados y secretos:**
   - En el menú lateral: **Certificados y secretos**

2. **Crear nuevo secreto:**
   - Click en "Nuevo secreto de cliente"
   - **Descripción:** `AutomAI SSO Secret`
   - **Expira:** Selecciona duración (recomendado: 24 meses)
   - Click en "Agregar"

3. **Copiar valores:**
   - Se mostrará el secreto (solo se muestra una vez)
   - ⚠️ **COPIA EL VALOR DEL SECRETO INMEDIATAMENTE**
   - También copia:
     - **ID de aplicación (cliente):** (visible en "Información general")
     - **ID de directorio (inquilino):** (visible en "Información general")

---

## ⚙️ PARTE 3: Configurar Variables de Entorno

### Paso 1: Localizar archivo .env

El archivo de configuración está en: `apps/api/.env`

### Paso 2: Agregar Variables de Google OAuth

Abre `apps/api/.env` y agrega:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=tu-google-client-id-aqui
GOOGLE_CLIENT_SECRET=tu-google-client-secret-aqui
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

**Para producción, cambia:**
```env
GOOGLE_REDIRECT_URI=https://tu-dominio.com/auth/google/callback
```

### Paso 3: Agregar Variables de Microsoft OAuth

En el mismo archivo `apps/api/.env`, agrega:

```env
# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=tu-microsoft-client-id-aqui
MICROSOFT_CLIENT_SECRET=tu-microsoft-client-secret-aqui
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

**Explicación de MICROSOFT_TENANT_ID:**
- `common`: Permite cualquier cuenta de Microsoft (personal o organizacional)
- `organizations`: Solo cuentas organizacionales
- `consumers`: Solo cuentas personales
- `{tenant-id}`: ID específico de tu organización

**Para producción:**
```env
MICROSOFT_REDIRECT_URI=https://tu-dominio.com/auth/microsoft/callback
```

### Paso 4: Configurar URL del Frontend

Asegúrate de tener configurado:

```env
# Frontend URL (para redirects después de OAuth)
FRONTEND_URL=http://localhost:3000
```

**Para producción:**
```env
FRONTEND_URL=https://tu-dominio.com
```

### Ejemplo Completo de .env

```env
# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=abc12345-6789-0123-4567-890abcdef123
MICROSOFT_CLIENT_SECRET=abc~DEF123ghi456JKL789mno012PQR345
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/microsoft/callback
MICROSOFT_TENANT_ID=common

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Otros (si no están configurados)
NODE_ENV=development
PORT=3001
```

---

## ✅ PARTE 4: Verificar Configuración

### Paso 1: Reiniciar el Servidor

Después de agregar las variables de entorno:

```bash
# Detener el servidor si está corriendo (Ctrl+C)
# Luego reiniciar
npm run dev
# o
yarn dev
```

### Paso 2: Verificar Logs

Al iniciar el servidor, deberías ver:

```
✅ Google OAuth configured
✅ Microsoft OAuth configured
```

Si ves advertencias como:
```
⚠️ Google OAuth not configured. GoogleStrategy will be disabled.
```

Significa que faltan las variables de entorno o están mal configuradas.

### Paso 3: Probar en el Navegador

1. **Ir a la página de login:**
   - `http://localhost:3000/login`

2. **Probar Google:**
   - Click en "Continuar con Google"
   - Deberías ser redirigido a Google para autenticarte
   - Después de autenticarte, deberías volver a tu app

3. **Probar Microsoft:**
   - Click en "Continuar con Microsoft"
   - Deberías ser redirigido a Microsoft para autenticarte
   - Después de autenticarte, deberías volver a tu app

---

## 🔧 Solución de Problemas

### Error: "redirect_uri_mismatch"

**Causa:** La URL de redirección no coincide con la configurada en Google/Microsoft.

**Solución:**
1. Verifica que `GOOGLE_REDIRECT_URI` o `MICROSOFT_REDIRECT_URI` coincidan exactamente
2. En Google Cloud Console / Azure Portal, verifica que la URI esté agregada
3. Asegúrate de que no haya espacios o caracteres extra

### Error: "invalid_client"

**Causa:** Client ID o Client Secret incorrectos.

**Solución:**
1. Verifica que copiaste correctamente los valores
2. Asegúrate de que no haya espacios al inicio o final
3. Verifica que el archivo `.env` esté en `apps/api/.env`

### Error: "access_denied"

**Causa:** El usuario canceló la autenticación o no tiene permisos.

**Solución:**
1. Verifica que los scopes estén configurados correctamente
2. En Google: Verifica que `userinfo.email` y `userinfo.profile` estén habilitados
3. En Microsoft: Verifica que `User.Read` esté configurado

### Los botones SSO no aparecen

**Causa:** Las estrategias no se están cargando.

**Solución:**
1. Verifica los logs del servidor al iniciar
2. Asegúrate de que las variables de entorno estén configuradas
3. Reinicia el servidor después de agregar las variables

---

## 📝 Checklist de Configuración

### Google OAuth
- [ ] Proyecto creado en Google Cloud Console
- [ ] Pantalla de consentimiento OAuth configurada
- [ ] ID de cliente creado
- [ ] Secreto de cliente copiado
- [ ] URI de redirección agregada en Google Console
- [ ] Variables agregadas en `apps/api/.env`
- [ ] Servidor reiniciado
- [ ] Prueba exitosa en navegador

### Microsoft OAuth
- [ ] Aplicación registrada en Azure Portal
- [ ] URI de redirección configurada
- [ ] Permisos de API configurados (User.Read)
- [ ] Secreto de cliente creado y copiado
- [ ] ID de aplicación copiado
- [ ] Variables agregadas en `apps/api/.env`
- [ ] Servidor reiniciado
- [ ] Prueba exitosa en navegador

---

## 🚀 Configuración para Producción

### Cambios Necesarios:

1. **Actualizar URIs de redirección:**
   ```env
   GOOGLE_REDIRECT_URI=https://tu-dominio.com/auth/google/callback
   MICROSOFT_REDIRECT_URI=https://tu-dominio.com/auth/microsoft/callback
   FRONTEND_URL=https://tu-dominio.com
   ```

2. **En Google Cloud Console:**
   - Agregar la URL de producción en "URI de redirección autorizados"
   - Verificar el dominio (si es necesario)

3. **En Azure Portal:**
   - Agregar la URL de producción en "URI de redirección"
   - Configurar permisos adicionales si es necesario

4. **Seguridad:**
   - Usar variables de entorno del servidor (no hardcodear)
   - Usar HTTPS en producción
   - Rotar secretos periódicamente

---

## 📚 Recursos Adicionales

- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2
- **Microsoft OAuth:** https://learn.microsoft.com/en-us/azure/active-directory/develop/
- **Documentación del proyecto:** Ver `docs/PRD/PRD-07-auth-advanced-sso.md`

---

**Última actualización:** 2025-01-27


