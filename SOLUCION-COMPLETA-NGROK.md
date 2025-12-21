# Solución Completa para ngrok

## Problema Actual

1. **ERR_NGROK_334**: El túnel `https://fibroblastic-skyler-trimestral.ngrok-free.dev` está activo en el dashboard de ngrok
2. **ERR_CONNECTION_REFUSED**: El backend no está corriendo o está configurado incorrectamente
3. **Configuración incorrecta**: `NEXT_PUBLIC_API_URL` tiene la URL del frontend, no del backend

## Solución Paso a Paso

### Paso 1: Detener túneles de ngrok activos

**Opción A: Desde el Dashboard de ngrok**
1. Ve a: https://dashboard.ngrok.com
2. Inicia sesión con tu cuenta de ngrok
3. Ve a la sección "Tunnels" o "Cloud Edge" en el menú lateral
4. Busca el túnel `fibroblastic-skyler-trimestral.ngrok-free.dev`
5. Haz clic en "Stop" o "Delete" para detenerlo
6. Espera 1-2 minutos

**Opción B: Usando la API local de ngrok (si ngrok está corriendo)**
```powershell
# Ver túneles activos
Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" | ConvertTo-Json

# Detener un túnel específico (reemplaza TUNNEL_NAME con el nombre del túnel)
Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels/TUNNEL_NAME" -Method Delete
```

**Opción C: Desde PowerShell (detener procesos locales)**
```powershell
.\stop-ngrok.ps1
```

**Opción D: Esperar (los túneles se liberan automáticamente)**
Si no puedes acceder al dashboard, espera 3-5 minutos y los túneles se liberarán automáticamente.

### Paso 2: Iniciar el backend localmente

```powershell
.\start-backend.ps1
```

O inicia todo el sistema:
```powershell
.\start-system.ps1
```

**VERIFICA** que el backend esté corriendo:
```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen
```

Deberías ver algo como:
```
LocalAddress LocalPort State
------------ --------- -----
0.0.0.0       3001     Listen
```

### Paso 3: Iniciar ngrok con URLs diferentes

```powershell
.\start-ngrok.ps1
```

Esto abrirá DOS ventanas de ngrok:
- **Ventana 1**: Frontend (puerto 3000) - URL como: `https://abc123.ngrok-free.app`
- **Ventana 2**: Backend (puerto 3001) - URL como: `https://xyz789.ngrok-free.app`

**IMPORTANTE**: Copia la URL del BACKEND (puerto 3001), NO la del frontend.

### Paso 4: Configurar el frontend con la URL del backend

Edita `apps/web/.env.local` y actualiza `NEXT_PUBLIC_API_URL` con la URL del BACKEND:

```env
NEXT_PUBLIC_API_URL=https://xyz789.ngrok-free.app
```

**NO uses la URL del frontend aquí.**

### Paso 5: Reiniciar el frontend

```powershell
.\start-frontend.ps1
```

O si ya está corriendo, deténlo (Ctrl+C) y reinícialo.

## Verificación

1. **Backend local corriendo**: `Get-NetTCPConnection -LocalPort 3001 -State Listen`
2. **Frontend local corriendo**: `Get-NetTCPConnection -LocalPort 3000 -State Listen`
3. **Túneles de ngrok activos**: Revisa las ventanas de ngrok
4. **Configuración correcta**: `apps/web/.env.local` debe tener la URL del BACKEND

## Resumen de URLs

- **Frontend local**: `http://localhost:3000`
- **Backend local**: `http://localhost:3001`
- **Frontend ngrok**: `https://abc123.ngrok-free.app` (para acceder desde Internet)
- **Backend ngrok**: `https://xyz789.ngrok-free.app` (debe estar en `NEXT_PUBLIC_API_URL`)

## Si el error ERR_NGROK_334 persiste

1. **Opción 1**: Ve al dashboard: https://dashboard.ngrok.com → Inicia sesión → Sección "Tunnels" → Detén todos los túneles activos
2. **Opción 2**: Usa la API local: `Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels"` para ver y detener túneles
3. **Opción 3**: Ejecuta `.\stop-ngrok.ps1` para detener procesos locales
4. **Opción 4**: Espera 3-5 minutos (los túneles se liberan automáticamente)
5. Vuelve a ejecutar `.\start-ngrok.ps1`

## Notas Importantes

- `NEXT_PUBLIC_API_URL` debe ser la URL del **BACKEND** de ngrok, NO del frontend
- El backend debe estar corriendo localmente para que ngrok pueda hacer el túnel
- Si accedes desde `localhost:3000`, usará `localhost:3001` (ignora `NEXT_PUBLIC_API_URL`)
- Si accedes desde la URL de ngrok, usará `NEXT_PUBLIC_API_URL` (debe ser la URL del backend)


