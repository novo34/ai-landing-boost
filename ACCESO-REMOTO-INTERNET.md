# Guia de Acceso Remoto desde Internet

Esta guia te ayudara a configurar tu sistema para que dispositivos desde **cualquier lugar del mundo** puedan acceder a tu aplicacion, incluso si no estan en la misma red WiFi.

## Opciones Disponibles

### Opcion 1: ngrok (Recomendado para Desarrollo)

**ngrok** es un servicio que crea tuneles seguros desde Internet hacia tu servidor local. Es gratuito y muy facil de usar.

#### Ventajas:
- ✅ Facil de configurar
- ✅ Gratis (con limitaciones)
- ✅ URLs HTTPS automaticas
- ✅ No requiere configuracion del router
- ✅ Funciona desde cualquier lugar

#### Limitaciones (plan gratuito):
- URLs cambian cada vez que reinicias (a menos que uses authtoken)
- Limite de conexiones simultaneas
- Timeout despues de 2 horas de inactividad

#### Pasos de Configuracion:

1. **Instalar ngrok:**
   ```powershell
   # Opcion A: Usando winget (recomendado)
   winget install ngrok
   
   # Opcion B: Descargar manualmente
   # Ve a https://ngrok.com/download
   # Descarga y extrae ngrok.exe
   ```

2. **Configurar ngrok (opcional pero recomendado):**
   ```powershell
   # Crear cuenta gratuita en https://ngrok.com
   # Obtener authtoken del dashboard
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```
   
   Esto permite:
   - URLs estables (no cambian cada vez)
   - Mas conexiones simultaneas
   - Sin timeout automatico

3. **Iniciar los tuneles:**
   ```powershell
   .\start-ngrok.ps1
   ```
   
   Esto abrira dos ventanas de PowerShell con los tuneles:
   - Una para el frontend (puerto 3000)
   - Una para el backend (puerto 3001)

4. **Obtener las URLs publicas:**
   
   En cada ventana de ngrok veras algo como:
   ```
   Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
   ```
   
   Copia estas URLs.

5. **Configurar el frontend para usar la URL del backend:**
   
   Edita `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://TU_URL_NGROK_BACKEND
   ```
   
   Por ejemplo:
   ```env
   NEXT_PUBLIC_API_URL=https://xyz789.ngrok-free.app
   ```

6. **Compartir la URL del frontend:**
   
   Cualquier persona puede acceder usando:
   ```
   https://abc123.ngrok-free.app
   ```

#### Scripts Disponibles:

- `.\setup-ngrok.ps1` - Verifica instalacion y configuracion de ngrok
- `.\start-ngrok.ps1` - Inicia los tuneles para frontend y backend

### Opcion 2: Cloudflare Tunnel (Alternativa)

Cloudflare Tunnel es otra opcion gratuita y mas estable que ngrok.

#### Ventajas:
- ✅ Gratis e ilimitado
- ✅ URLs personalizadas (con dominio propio)
- ✅ Mas estable que ngrok
- ✅ Mejor rendimiento

#### Desventajas:
- Requiere mas configuracion inicial
- Necesita cuenta de Cloudflare

### Opcion 3: Port Forwarding (No Recomendado)

Exponer directamente tu router a Internet.

#### Desventajas:
- ❌ Requiere IP publica estatica
- ❌ Configuracion compleja del router
- ❌ Riesgos de seguridad
- ❌ Puede violar terminos de servicio del ISP

**NO recomendamos esta opcion para desarrollo.**

## Configuracion del Backend para CORS

El backend ya esta configurado para permitir cualquier origen en desarrollo. Si usas ngrok, las URLs de ngrok se permitiran automaticamente.

Si necesitas agregar URLs especificas, edita `apps/api/.env`:
```env
FRONTEND_URL=https://TU_URL_NGROK_FRONTEND
```

## Seguridad

⚠️ **IMPORTANTE**: Cuando expones tu servidor a Internet:

1. **Solo para desarrollo**: No uses esto en produccion sin medidas de seguridad adicionales
2. **URLs temporales**: Las URLs de ngrok (sin authtoken) cambian cada vez
3. **Limita el acceso**: Considera usar autenticacion adicional
4. **No compartas URLs publicamente**: Solo compartelas con personas de confianza

## Solucion de Problemas

### ngrok no se inicia

**Problema**: Error al ejecutar ngrok
**Solucion**: 
```powershell
# Verifica que ngrok este instalado
ngrok version

# Si no esta, instala:
winget install ngrok
```

### Error: "endpoint is already online" (ERR_NGROK_334)

**Problema**: ngrok dice que el endpoint ya esta en uso
**Solucion 1 - Detener tuneles locales:**
```powershell
# Detener todos los tuneles existentes
.\stop-ngrok.ps1

# Luego iniciar de nuevo
.\start-ngrok.ps1
```

**Solucion 2 - Detener tuneles desde el dashboard:**
1. Ve a https://dashboard.ngrok.com/status/tunnels
2. Detiene manualmente los tuneles activos
3. Vuelve a ejecutar `.\start-ngrok.ps1`

**Solucion 3 - Usar modo simple:**
```powershell
# Usa el script alternativo que maneja mejor los conflictos
.\start-ngrok-simple.ps1
```

**Solucion 4 - Esperar:**
Los tuneles de ngrok pueden tardar unos minutos en liberarse. Espera 2-3 minutos y vuelve a intentar.

**Solucion 5 - Usar pooling (ya incluido en start-ngrok.ps1):**
El script ahora usa `--pooling-enabled` automaticamente para evitar este error.

### URLs no funcionan

**Problema**: Las URLs de ngrok no cargan
**Solucion**:
1. Verifica que los servidores esten corriendo (`.\start-system.ps1`)
2. Verifica que ngrok este conectado (deberia mostrar "Session Status: online")
3. Asegurate de usar HTTPS (ngrok siempre usa HTTPS)

### El frontend no se conecta al backend

**Problema**: El frontend carga pero no puede conectar con la API
**Solucion**:
1. Verifica que configuraste `NEXT_PUBLIC_API_URL` en `apps/web/.env.local`
2. Usa la URL HTTPS del backend (no HTTP)
3. Reinicia el frontend despues de cambiar la variable de entorno

### Error de CORS

**Problema**: Error de CORS al acceder desde Internet
**Solucion**:
1. Agrega la URL del frontend a `FRONTEND_URL` en `apps/api/.env`
2. Reinicia el backend

## Ejemplo Completo

1. **Inicia los servidores:**
   ```powershell
   .\start-system.ps1
   ```

2. **Inicia ngrok:**
   ```powershell
   .\start-ngrok.ps1
   ```

3. **Obtienes las URLs:**
   - Frontend: `https://abc123.ngrok-free.app`
   - Backend: `https://xyz789.ngrok-free.app`

4. **Configuras el frontend:**
   Edita `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://xyz789.ngrok-free.app
   ```

5. **Reinicia el frontend** (Ctrl+C y vuelve a ejecutar `pnpm run dev`)

6. **Compartes la URL del frontend:**
   ```
   https://abc123.ngrok-free.app
   ```

¡Listo! Cualquier persona puede acceder desde cualquier lugar.


