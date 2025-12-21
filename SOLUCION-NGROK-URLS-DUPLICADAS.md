# Solución: ngrok Asigna la Misma URL a Ambos Túneles

## 🔴 Problema Detectado

Cuando ejecutas `.\start-ngrok_2.ps1`, ambos túneles (frontend y backend) reciben la **misma URL pública**:
- Frontend: `https://fibroblastic-skyler-trimestral.ngrok-free.dev`
- Backend: `https://fibroblastic-skyler-trimestral.ngrok-free.dev` (MISMA URL)

**Consecuencias:**
- ❌ Las peticiones a `/auth/login` van al frontend en lugar del backend
- ❌ El frontend devuelve 404 porque no tiene esa ruta
- ❌ No puedes hacer login desde la URL de ngrok

## 🔍 Diagnóstico

Ejecuta el script de diagnóstico:

```powershell
.\diagnostico-ngrok.ps1
```

Este script verificará:
- ✅ Instalación de ngrok
- ✅ Configuración del authtoken
- ✅ Puertos locales (3000 y 3001)
- ✅ Túneles activos y sus URLs
- ✅ Configuración del frontend
- ✅ Conexión al backend

## ✅ Solución 1: Usar Túneles Separados (RECOMENDADO)

Usa el script que inicia túneles en procesos separados:

```powershell
.\start-ngrok-separados.ps1
```

**Ventajas:**
- ✅ Cada túnel tiene su propia URL única
- ✅ Garantiza que no haya conflictos
- ✅ Más fácil de identificar qué URL corresponde a cada servicio

**Pasos:**
1. Ejecuta `.\start-ngrok-separados.ps1`
2. Se abrirán DOS ventanas de PowerShell con ngrok
3. Copia la URL del **BACKEND** (puerto 3001)
4. Configúrala en `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://TU_URL_BACKEND_NGROK
   ```
5. Reinicia el frontend si ya estaba corriendo

## ✅ Solución 2: Verificar y Corregir ngrok.yml

El archivo `ngrok.yml` ha sido actualizado. Verifica que tenga este formato:

```yaml
version: "2"

region: eu

tunnels:
  frontend:
    proto: http
    addr: http://localhost:3000
    inspect: true
    
  backend:
    proto: http
    addr: http://localhost:3001
    inspect: true
```

**Nota:** El authtoken NO debe estar en el archivo `ngrok.yml`. Debe estar configurado globalmente:

```powershell
ngrok config add-authtoken TU_TOKEN
```

## ✅ Solución 3: Detener y Reiniciar

Si el problema persiste:

1. **Detén todos los túneles de ngrok:**
   - Presiona `Ctrl+C` en todas las ventanas de ngrok
   - O ve a https://dashboard.ngrok.com y detén los túneles activos

2. **Espera 1-2 minutos** para que los túneles se liberen

3. **Reinicia con túneles separados:**
   ```powershell
   .\start-ngrok-separados.ps1
   ```

## 🔧 Verificación

Después de aplicar la solución:

1. **Verifica las URLs de los túneles:**
   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" | ConvertTo-Json
   ```
   
   Deberías ver URLs **diferentes** para frontend y backend.

2. **Verifica la configuración del frontend:**
   ```powershell
   Get-Content apps\web\.env.local | Select-String "NEXT_PUBLIC_API_URL"
   ```
   
   Debe tener la URL del **BACKEND**, no del frontend.

3. **Prueba el login:**
   - Accede a la URL del frontend desde ngrok
   - Intenta hacer login
   - Debe funcionar correctamente

## 📝 Notas Importantes

- **NEXT_PUBLIC_API_URL** debe ser la URL del **BACKEND** de ngrok, NO del frontend
- El backend debe estar corriendo localmente en el puerto 3001
- El frontend debe estar corriendo localmente en el puerto 3000
- Si accedes desde `localhost:3000`, el frontend usará `localhost:3001` automáticamente
- Si accedes desde la URL de ngrok, el frontend usará `NEXT_PUBLIC_API_URL`

## 🐛 Si el Problema Persiste

1. **Actualiza ngrok:**
   ```powershell
   winget upgrade ngrok.ngrok
   ```

2. **Verifica tu plan de ngrok:**
   - Ve a https://dashboard.ngrok.com
   - Verifica que tengas un plan que permita múltiples túneles

3. **Usa el script de diagnóstico:**
   ```powershell
   .\diagnostico-ngrok.ps1
   ```

4. **Revisa los logs de ngrok:**
   - Abre http://127.0.0.1:4040 en tu navegador
   - Revisa las peticiones y errores
