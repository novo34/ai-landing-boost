# Verificación Rápida: Backend No Responde

## 🔍 Problema
El login se queda en "Cargando..." y no se conecta al backend.

## ✅ Solución Rápida

### 1. Verificar que el Backend Esté Corriendo

```powershell
# Verificar puerto 3001
Test-NetConnection -ComputerName localhost -Port 3001
```

Si no responde, el backend NO está corriendo.

### 2. Iniciar el Backend

```powershell
cd apps\api
npm run start:dev
```

Deberías ver:
```
✅ Environment variables validated
✅ API is running
URL: http://[::1]:3001
```

### 3. Verificar Variables de Entorno

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend (`apps/api/.env`):**
```env
DATABASE_URL=mysql://root@localhost:3306/ai_agencia
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
```

### 4. Probar Endpoint Directamente

Abre en el navegador o usa PowerShell:

```powershell
# ⚠️ IMPORTANTE: Usa credenciales de prueba, nunca contraseñas reales
# Configura las variables de entorno primero:
# $env:TEST_EMAIL="test@example.com"
# $env:TEST_PASSWORD="your_test_password"

$body = @{email=$env:TEST_EMAIL;password=$env:TEST_PASSWORD} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -Method POST -Body $body -ContentType 'application/json'
```

Si esto falla, el backend no está corriendo o hay un problema de configuración.

## 🐛 Errores Comunes

1. **ERR_CONNECTION_REFUSED** → Backend no está corriendo
2. **Timeout** → Backend está corriendo pero no responde (problema de BD o código)
3. **CORS error** → FRONTEND_URL no está configurado correctamente

## 📝 Checklist

- [ ] Backend corriendo (puerto 3001 accesible)
- [ ] Base de datos MySQL corriendo
- [ ] Variables de entorno configuradas
- [ ] No hay errores en la consola del backend
- [ ] La petición aparece en Network tab del navegador

