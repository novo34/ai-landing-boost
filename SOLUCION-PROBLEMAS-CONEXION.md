# Solucion de Problemas de Conexion Remota

## Estado Actual

Segun el diagnostico, todo esta configurado correctamente:
- ✅ IP encontrada: 192.168.1.161 (Wi-Fi)
- ✅ Reglas de firewall configuradas
- ✅ Puertos 3000 y 3001 escuchando en 0.0.0.0

## Pasos para Solucionar

### 1. Verificar que el Movil este en la Misma Red

**En tu movil:**
- Ve a Configuracion > WiFi
- Verifica que estas conectado a la misma red WiFi que tu PC
- Anota la IP de tu movil (deberia ser algo como 192.168.1.xxx)

**En tu PC:**
```powershell
# Verifica tu IP
.\get-local-ip.ps1
```

Ambos dispositivos deben tener IPs que empiecen con `192.168.1.` (o la misma subred).

### 2. Verificar que los Servidores Esten Corriendo

**En tu PC:**
```powershell
# Verifica que los puertos esten escuchando
netstat -an | findstr ":3000"
netstat -an | findstr ":3001"
```

Deberias ver:
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING
```

Si no ves esto, reinicia los servidores:
```powershell
.\start-system.ps1
```

### 3. Probar Conexion desde el PC

**En tu PC, abre un navegador y prueba:**
- http://192.168.1.161:3000 (deberia funcionar)
- http://192.168.1.161:3001 (deberia mostrar la API o un error de CORS, pero deberia responder)

Si funciona desde el PC pero no desde el movil, el problema es de red/router.

### 4. Verificar Configuracion del Router

Algunos routers tienen una configuracion llamada "Aislamiento de AP" o "AP Isolation" que bloquea la comunicacion entre dispositivos WiFi. 

**Pasos:**
1. Accede a la configuracion de tu router (normalmente http://192.168.1.1 o http://192.168.0.1)
2. Busca "AP Isolation", "Client Isolation" o "Aislamiento de AP"
3. **DESACTIVALO** si esta activado
4. Guarda los cambios y reinicia el router si es necesario

### 5. Probar con Ping

**En tu PC:**
```powershell
# Desde el PC, intenta hacer ping al movil (si conoces su IP)
ping 192.168.1.XXX
```

**En tu movil:**
- Descarga una app de ping o usa una terminal
- Intenta hacer ping a 192.168.1.161

Si el ping no funciona, hay un problema de red/router.

### 6. Verificar Firewall del Router

Algunos routers tienen un firewall que bloquea conexiones entre dispositivos. Verifica la configuracion del router y desactiva el firewall interno si es necesario (solo para desarrollo local).

### 7. Usar IP Estatica

Si tu IP cambia frecuentemente (DHCP), considera asignar una IP estatica a tu PC:

1. Ve a Configuracion de Red en Windows
2. Configura una IP estatica (ej: 192.168.1.100)
3. Usa esta IP para acceder desde el movil

### 8. Alternativa: Usar Hotspot del Movil

Si nada funciona, prueba crear un hotspot desde tu movil y conecta tu PC a ese hotspot. Luego accede desde el movil usando la IP del PC en esa red.

## URLs Correctas

**Desde el movil, usa:**
- Frontend: `http://192.168.1.161:3000`
- Backend: `http://192.168.1.161:3001`

**NO uses:**
- ❌ `http://172.30.64.1:3000` (esta es la IP de WSL, no funciona)
- ❌ `http://localhost:3000` (solo funciona en el mismo dispositivo)

## Verificacion Final

Ejecuta el diagnostico completo:
```powershell
.\diagnostico-red.ps1
```

Si todo muestra [OK] pero aun no funciona, el problema es muy probablemente:
1. Router bloqueando comunicacion entre dispositivos
2. Dispositivos en redes diferentes
3. Firewall del router activo

## Contacto

Si nada funciona, comparte:
1. El resultado completo de `.\diagnostico-red.ps1`
2. La IP de tu movil (Configuracion > WiFi > Detalles)
3. Si puedes hacer ping entre dispositivos


