# Auditoría del Sistema de Login

## ✅ Verificaciones Realizadas

### 1. Base de Datos - USUARIOS CORRECTOS ✅
- ✅ Todos los usuarios están creados correctamente
- ✅ Todos tienen `passwordHash` válido
- ✅ Todos tienen membresías en el tenant "AI Landing Boost"
- ✅ Las contraseñas coinciden con las especificadas
- ✅ El tenant está en estado ACTIVE

**Usuarios verificados:**
- `klever@admin.com` - ✅ PasswordHash existe, contraseña válida
- `klever@cliente.com` - ✅ PasswordHash existe, contraseña válida
- `jorge@admin.com` - ✅ PasswordHash existe, contraseña válida
- `jorge@cliente.com` - ✅ PasswordHash existe, contraseña válida

### 2. Código del Backend - CORRECTO ✅
- ✅ El endpoint `/auth/login` está correctamente configurado
- ✅ El método `login()` en `AuthService` valida correctamente:
  - Busca el usuario por email
  - Verifica que tenga passwordHash
  - Compara la contraseña con bcrypt
  - Verifica que tenga un tenant activo
  - Genera tokens JWT
- ✅ El controlador está marcado con `@Public()` para permitir acceso sin autenticación
- ✅ Las cookies se configuran correctamente

### 3. Código del Frontend - CORRECTO ✅
- ✅ El cliente API usa la URL correcta: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`
- ✅ El método `login()` hace POST a `/auth/login` con email y password
- ✅ Incluye `credentials: 'include'` para enviar/recibir cookies

## 🔍 Posibles Problemas y Soluciones

### Problema 1: Servidor Backend No Está Corriendo
**Síntoma:** Error `ERR_CONNECTION_REFUSED` en el navegador

**Solución:**
```bash
cd apps/api
npm run start:dev
```

Verificar que veas en la consola:
```
✅ API is running
URL: http://[::1]:3001
```

### Problema 2: Variable de Entorno NEXT_PUBLIC_API_URL Incorrecta
**Síntoma:** El frontend intenta conectarse a una URL incorrecta

**Solución:**
Crear o verificar `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Luego reiniciar el servidor frontend:
```bash
cd apps/web
npm run dev
```

### Problema 3: CORS Bloqueando las Peticiones
**Síntoma:** Error de CORS en la consola del navegador

**Solución:**
Verificar que `apps/api/.env` tenga:
```env
FRONTEND_URL=http://localhost:3000
```

Si el frontend corre en otro puerto, agregarlo:
```env
FRONTEND_URL=http://localhost:3000,http://localhost:3002
```

### Problema 4: Cookies No Se Están Enviando
**Síntoma:** El login funciona pero las siguientes peticiones fallan

**Verificar:**
1. En el navegador, abrir DevTools > Application > Cookies
2. Verificar que existan `access_token` y `refresh_token`
3. Verificar que el dominio sea `localhost` (no `127.0.0.1`)

**Solución:**
- Asegurarse de acceder a `http://localhost:3000` (no `127.0.0.1:3000`)
- Verificar que `credentials: 'include'` esté en todas las peticiones

### Problema 5: Error en la Validación de DTO
**Síntoma:** Error 400 Bad Request

**Verificar:**
El DTO requiere:
- `email`: debe ser un email válido
- `password`: debe ser string

**Solución:**
Asegurarse de que el frontend envíe las credenciales correctas:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura"
}
```
⚠️ **IMPORTANTE:** Usa variables de entorno para las credenciales de prueba, nunca las hardcodees.

## 🧪 Pasos para Diagnosticar

### Paso 1: Verificar que el Backend Está Corriendo
```bash
# En una terminal
cd apps/api
npm run start:dev
```

Deberías ver:
```
✅ Environment variables validated
✅ API is running
URL: http://[::1]:3001
```

### Paso 2: Probar el Endpoint Directamente
Abrir en el navegador o usar Postman:
```
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "klever@admin.com",
  "password": "contraseña_segura"  // ⚠️ Usa variables de entorno, nunca hardcodees contraseñas
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "klever@admin.com",
    "name": "Klever Admin"
  }
}
```

Y deberías ver cookies `access_token` y `refresh_token` en los headers.

### Paso 3: Verificar Variables de Entorno del Frontend
```bash
cd apps/web
cat .env.local
```

Debería contener:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Paso 4: Verificar en el Navegador
1. Abrir DevTools (F12)
2. Ir a la pestaña Network
3. Intentar hacer login
4. Verificar:
   - La petición va a `http://localhost:3001/auth/login`
   - El método es POST
   - El status code es 200
   - Se reciben cookies en la respuesta

### Paso 5: Verificar Logs del Backend
Cuando intentas hacer login, deberías ver en la consola del backend:
```
✅ Public route accessed: POST /auth/login
```

Si hay errores, aparecerán ahí.

## 📋 Checklist de Verificación

- [ ] Backend corriendo en `http://localhost:3001`
- [ ] Frontend corriendo en `http://localhost:3000`
- [ ] Variable `NEXT_PUBLIC_API_URL` configurada en frontend
- [ ] Variable `FRONTEND_URL` configurada en backend
- [ ] Usuarios existen en la base de datos (verificado ✅)
- [ ] Usuarios tienen passwordHash (verificado ✅)
- [ ] Usuarios tienen membresías en tenant activo (verificado ✅)
- [ ] El endpoint `/auth/login` es accesible (probar con Postman/curl)
- [ ] No hay errores de CORS en la consola del navegador
- [ ] Las cookies se están recibiendo después del login

## 🔧 Comandos Útiles

### Verificar procesos Node corriendo
```powershell
Get-Process -Name node
```

### Verificar puerto 3001
```powershell
Test-NetConnection -ComputerName localhost -Port 3001
```

### Verificar usuarios en BD
```bash
cd apps/api
npm run create-users
```

### Probar login desde terminal (PowerShell)
```powershell
# ⚠️ IMPORTANTE: Usa variables de entorno para credenciales
# $env:TEST_EMAIL="test@example.com"
# $env:TEST_PASSWORD="your_test_password"
$body = @{email=$env:TEST_EMAIL;password=$env:TEST_PASSWORD} | ConvertTo-Json
$response = Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -Method POST -Body $body -ContentType 'application/json'
$response.Content
```

## 🎯 Próximos Pasos

1. **Verificar que el backend esté corriendo** - Este es el problema más común
2. **Verificar la URL del API en el frontend** - Asegurarse de que apunte a `http://localhost:3001`
3. **Revisar la consola del navegador** - Ver qué error específico aparece
4. **Revisar los logs del backend** - Ver si la petición llega al servidor

## 📞 Información de Debug

Si el problema persiste, proporciona:
1. El error exacto de la consola del navegador
2. El status code de la petición en Network tab
3. Los logs del backend cuando intentas hacer login
4. La configuración de `.env` y `.env.local`

