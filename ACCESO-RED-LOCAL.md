# Guía de Acceso desde Red Local

Esta guía te ayudará a configurar tu sistema de desarrollo para que otros dispositivos en tu red local puedan acceder a la aplicación, incluso si no están conectados a tu WiFi.

## 📋 Requisitos Previos

- Ambos dispositivos deben estar en la misma red (mismo router/WiFi)
- El firewall de Windows debe permitir conexiones en los puertos 3000 y 3001

## 🔧 Configuración Realizada

Ya se han realizado los siguientes cambios automáticamente:

1. ✅ **Backend (NestJS)**: Configurado para escuchar en `0.0.0.0` (todas las interfaces de red)
2. ✅ **Frontend (Next.js)**: Configurado para escuchar en `0.0.0.0` 
3. ✅ **CORS**: Actualizado para permitir IPs locales en desarrollo (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
4. ✅ **Scripts de inicio**: Actualizados para mostrar tu IP local

## 🚀 Pasos para Acceso Remoto

### 1. Obtener tu IP Local

**Opción A: Usando PowerShell (Recomendado)**
```powershell
# Ejecuta este comando en PowerShell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*" } | Select-Object IPAddress, InterfaceAlias
```

**Opción B: Usando el script incluido**
```powershell
.\get-local-ip.ps1
```

**Opción C: Usando CMD**
```cmd
ipconfig | findstr /i "IPv4"
```

Busca la IP que comienza con:
- `192.168.x.x` (más común en redes domésticas)
- `10.x.x.x`
- `172.16.x.x` a `172.31.x.x`

### 2. Configurar el Firewall de Windows

Necesitas permitir conexiones entrantes en los puertos 3000 y 3001.

**Opción A: Usando PowerShell (Como Administrador)**
```powershell
# Permitir puerto 3000 (Frontend)
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Permitir puerto 3001 (Backend)
New-NetFirewallRule -DisplayName "NestJS API Dev Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Opción B: Usando la Interfaz Gráfica**
1. Abre "Firewall de Windows Defender" desde el Panel de Control
2. Haz clic en "Configuración avanzada"
3. Selecciona "Reglas de entrada" → "Nueva regla"
4. Selecciona "Puerto" → Siguiente
5. TCP → Puertos específicos: `3000,3001` → Siguiente
6. "Permitir la conexión" → Siguiente
7. Marca todas las opciones → Siguiente
8. Nombre: "Desarrollo Web Local" → Finalizar

**Opción C: Usar el script incluido**
```powershell
# Ejecuta como administrador
.\configure-firewall.ps1
```

### 3. Iniciar el Sistema

Inicia el sistema usando cualquiera de estos métodos:

```powershell
# Opción 1: Sistema completo
.\start-system.ps1

# Opción 2: Por separado
.\start-backend.ps1
.\start-frontend.ps1
```

El script `start-system.ps1` ahora mostrará automáticamente tu IP local y las URLs de acceso.

### 4. Acceder desde Otro Dispositivo

Una vez que tengas tu IP local (por ejemplo: `192.168.1.100`), desde el otro dispositivo accede a:

- **Frontend**: `http://192.168.1.100:3000`
- **Backend API**: `http://192.168.1.100:3001`

## 🔍 Verificar que Funciona

### Desde tu máquina local:
```powershell
# Verificar que el servidor está escuchando en todas las interfaces
netstat -an | findstr ":3000"
netstat -an | findstr ":3001"
```

Deberías ver algo como:
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING
```

### Desde el dispositivo remoto:
1. Abre un navegador
2. Ve a `http://TU_IP_LOCAL:3000`
3. Deberías ver la aplicación funcionando

## ⚠️ Solución de Problemas

### Error: "No se puede acceder a este sitio"

**Causa 1: Firewall bloqueando conexiones**
- Solución: Ejecuta los comandos de firewall de la sección 2

**Causa 2: IP incorrecta**
- Solución: Verifica tu IP con `ipconfig` o el script `get-local-ip.ps1`

**Causa 3: Dispositivos en redes diferentes**
- Solución: Asegúrate de que ambos dispositivos estén en la misma red WiFi

### Error: "CORS blocked"

**Causa**: El backend no reconoce la IP como origen válido
- Solución: Ya está configurado automáticamente. Si persiste, verifica que `NODE_ENV` no esté en `production`

### El frontend carga pero no puede conectar con el backend

**Causa**: El frontend está configurado para usar `localhost:3001`
- Solución: Necesitas actualizar la variable de entorno del frontend o usar un proxy

**Solución Rápida**: Edita `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://TU_IP_LOCAL:3001
```

O mejor aún, usa una variable dinámica. El frontend debería detectar automáticamente si está accediendo desde una IP local.

## 🔒 Consideraciones de Seguridad

⚠️ **IMPORTANTE**: Esta configuración es solo para desarrollo local. 

- No uses esta configuración en producción
- Solo permite acceso desde tu red local
- No expongas estos puertos a Internet
- El firewall de Windows proporciona una capa adicional de seguridad

## 📝 Notas Adicionales

- Si tu IP cambia (DHCP), necesitarás actualizar las URLs
- Algunos routers pueden tener configuraciones que bloquean comunicación entre dispositivos
- Si usas un VPN, puede interferir con el acceso a la red local

## 🆘 Scripts de Ayuda

Se han creado scripts auxiliares para facilitar el proceso:

- `get-local-ip.ps1`: Muestra tu IP local
- `configure-firewall.ps1`: Configura el firewall automáticamente (requiere admin)

Ejecuta estos scripts si necesitas ayuda adicional.


