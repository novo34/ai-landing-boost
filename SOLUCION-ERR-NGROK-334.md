# Solución para ERR_NGROK_334 - Endpoint ya en uso

## Problema Identificado

El error `ERR_NGROK_334` indica que un endpoint de ngrok ya está activo. Este problema ocurre porque:

1. **El plan gratuito de ngrok tiene limitaciones:**
   - Permite hasta **3 endpoints simultáneos**
   - Pero solo permite **1 sesión de agente** a la vez

2. **El script anterior (`start-ngrok.ps1`) iniciaba DOS procesos separados de ngrok:**
   - Un proceso para el frontend (puerto 3000)
   - Otro proceso para el backend (puerto 3001)
   - Esto creaba **DOS sesiones de agente**, violando la limitación del plan gratuito

3. **Cuando detienes los procesos localmente, el endpoint puede seguir activo en el dashboard de ngrok:**
   - Los endpoints pueden quedar registrados en el servidor de ngrok
   - Aunque detengas los procesos locales, el endpoint sigue "reservado" por unos minutos

## Solución Implementada

### Opción 1: Usar el Script Unificado (RECOMENDADO)

Se ha creado un nuevo script `start-ngrok-unified.ps1` que:

1. **Usa UNA SOLA sesión de agente de ngrok**
2. **Configura múltiples túneles en un archivo `ngrok.yml`**
3. **Inicia todos los túneles con `ngrok start --all`**

**Uso:**
```powershell
.\start-ngrok-unified.ps1
```

### Opción 2: Script Actualizado

El script `start-ngrok.ps1` ha sido actualizado para usar la misma configuración unificada.

**Uso:**
```powershell
.\start-ngrok.ps1
```

## Configuración Requerida

### Archivo `ngrok.yml`

Se ha creado un archivo `ngrok.yml` en la raíz del proyecto con la configuración de ambos túneles:

```yaml
version: "2"
authtoken: # Se configura automáticamente con: ngrok config add-authtoken TU_TOKEN

tunnels:
  frontend:
    addr: 3000
    proto: http
    region: us
    inspect: true
    
  backend:
    addr: 3001
    proto: http
    region: eu
    inspect: true
```

### Configurar Authtoken (Recomendado)

Para usar el plan gratuito con múltiples túneles, necesitas configurar tu authtoken:

1. Ve a https://dashboard.ngrok.com
2. Inicia sesión o crea una cuenta gratuita
3. Obtén tu authtoken desde el dashboard
4. Ejecuta:
   ```powershell
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```

**Sin authtoken:**
- ngrok funcionará pero con limitaciones
- URLs temporales que cambian cada vez
- Límite de conexiones más bajo
- Timeout después de 2 horas de inactividad

**Con authtoken:**
- URLs más estables
- Más conexiones simultáneas
- Sin timeout automático
- Mejor rendimiento

## Pasos para Resolver el Problema

### Paso 1: Detener todos los procesos de ngrok

```powershell
.\stop-ngrok.ps1
```

O manualmente:
```powershell
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Paso 2: Verificar túneles activos en el dashboard

1. Ve a https://dashboard.ngrok.com/status/tunnels
2. Inicia sesión con tu cuenta
3. Si hay túneles activos, deténlos manualmente
4. Espera 1-2 minutos

### Paso 3: Verificar que los servidores locales estén corriendo

```powershell
# Verificar frontend (puerto 3000)
Get-NetTCPConnection -LocalPort 3000 -State Listen

# Verificar backend (puerto 3001)
Get-NetTCPConnection -LocalPort 3001 -State Listen
```

Si no están corriendo:
```powershell
.\start-backend.ps1
.\start-frontend.ps1
```

### Paso 4: Iniciar ngrok con la configuración unificada

```powershell
.\start-ngrok-unified.ps1
```

O:
```powershell
.\start-ngrok.ps1
```

### Paso 5: Obtener las URLs públicas

Revisa la ventana de ngrok o la interfaz web en:
- http://localhost:4040

Verás dos URLs:
- **Frontend**: Para acceder a la aplicación desde Internet
- **Backend**: Para configurar en el frontend

### Paso 6: Configurar el frontend

Edita `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://TU_URL_NGROK_BACKEND
```

**IMPORTANTE:** Usa la URL del BACKEND, no la del frontend.

### Paso 7: Reiniciar el frontend

```powershell
.\start-frontend.ps1
```

## Verificación

### Ver túneles activos

```powershell
# Ver túneles via API local
Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" | ConvertTo-Json
```

### Verificar configuración

```powershell
.\verificar-ngrok.ps1
```

## Diferencias entre los Scripts

| Script | Descripción | Uso |
|--------|-------------|-----|
| `start-ngrok.ps1` | Script principal actualizado | Uso normal |
| `start-ngrok-unified.ps1` | Script unificado (mismo que el anterior) | Alternativa |
| `start-ngrok-simple.ps1` | Script simple con opciones | Si hay problemas |
| `start-ngrok-pooling.ps1` | Usa pooling (no recomendado) | Solo si es necesario |

## Limitaciones del Plan Gratuito

- ✅ Hasta **3 endpoints simultáneos**
- ✅ Solo **1 sesión de agente** a la vez
- ✅ URLs aleatorias (a menos que uses authtoken)
- ⚠️ Límite de conexiones simultáneas
- ⚠️ Timeout después de 2 horas de inactividad (sin authtoken)

## Si el Problema Persiste

1. **Espera 3-5 minutos** después de detener los procesos
   - Los endpoints se liberan automáticamente

2. **Verifica en el dashboard:**
   - https://dashboard.ngrok.com/status/tunnels
   - Detén todos los túneles manualmente

3. **Verifica que no haya otros procesos de ngrok:**
   ```powershell
   Get-Process -Name ngrok
   ```

4. **Reinicia ngrok completamente:**
   ```powershell
   .\stop-ngrok.ps1
   Start-Sleep -Seconds 10
   .\start-ngrok-unified.ps1
   ```

5. **Verifica la configuración:**
   - Asegúrate de que `ngrok.yml` existe en la raíz del proyecto
   - Verifica que tienes authtoken configurado (recomendado)

## Resumen

✅ **Problema:** Dos procesos separados de ngrok creaban dos sesiones de agente (violando la limitación del plan gratuito)

✅ **Solución:** Usar un solo agente de ngrok con múltiples túneles configurados en `ngrok.yml`

✅ **Resultado:** Ambos túneles (frontend y backend) funcionan en una sola sesión de agente, compatible con el plan gratuito
