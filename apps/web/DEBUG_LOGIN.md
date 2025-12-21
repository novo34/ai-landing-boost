# Debug: Problema de Login

## 🔍 Problema
El botón muestra "Cargando..." pero no completa el login y no hay logs en la consola.

## ✅ Soluciones Aplicadas
1. Estructura duplicada eliminada
2. Cache de Next.js limpiado

## 🔧 Pasos para Debug

### 1. Verificar que el Backend esté Corriendo

```powershell
cd apps\api
npm run start:dev
```

Deberías ver:
```
✅ API is running
URL: http://[::1]:3001
```

### 2. Verificar Variables de Entorno

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

### 3. Verificar en el Navegador

1. Abrir DevTools (F12)
2. Ir a la pestaña **Network**
3. Intentar hacer login
4. Buscar la petición a `/auth/login`
5. Verificar:
   - Status code (debería ser 200)
   - Response body
   - Headers (cookies)

### 4. Verificar Consola del Backend

Cuando intentas hacer login, deberías ver en la consola del backend:
```
✅ Public route accessed: POST /auth/login
```

Si no ves esto, el backend no está recibiendo la petición.

### 5. Probar Endpoint Directamente

```powershell
# ⚠️ IMPORTANTE: Usa variables de entorno para credenciales
# $env:TEST_EMAIL="test@example.com"
# $env:TEST_PASSWORD="your_test_password"
$body = @{email=$env:TEST_EMAIL;password=$env:TEST_PASSWORD} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -Method POST -Body $body -ContentType 'application/json' | Select-Object StatusCode, Content
```

## 🐛 Posibles Causas

1. **Backend no está corriendo** - Verificar proceso Node
2. **CORS bloqueando** - Verificar FRONTEND_URL en backend
3. **URL incorrecta** - Verificar NEXT_PUBLIC_API_URL
4. **Error silencioso** - Revisar Network tab en DevTools
5. **Cookies no se están enviando** - Verificar credentials: 'include'

## 📝 Checklist

- [ ] Backend corriendo en puerto 3001
- [ ] Frontend corriendo en puerto 3000
- [ ] Variable NEXT_PUBLIC_API_URL configurada
- [ ] Variable FRONTEND_URL configurada en backend
- [ ] No hay errores en consola del navegador
- [ ] La petición aparece en Network tab
- [ ] El backend recibe la petición (logs en consola)

