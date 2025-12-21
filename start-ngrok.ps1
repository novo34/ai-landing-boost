# Script para iniciar ngrok y exponer el sistema a Internet
# Crea URLs publicas que funcionan desde cualquier lugar
# 
# IMPORTANTE: Este script ahora usa UNA SOLA sesion de agente de ngrok
# para evitar el error ERR_NGROK_334 en el plan gratuito.
# El plan gratuito permite hasta 3 endpoints, pero solo 1 sesion de agente a la vez.

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando ngrok Tunnel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SOLUCION PARA ERR_NGROK_334:" -ForegroundColor Yellow
Write-Host "Usando configuracion unificada (una sola sesion de agente)" -ForegroundColor Yellow
Write-Host ""

# Verificar que ngrok este instalado
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host '[ERROR] ngrok no esta instalado' -ForegroundColor Red
    Write-Host "Ejecuta primero: .\setup-ngrok.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Verificar que los servidores esten corriendo
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

if (-not $port3000) {
    Write-Host '[ADVERTENCIA] Puerto 3000 no esta en escucha' -ForegroundColor Yellow
    Write-Host "Asegurate de que el frontend este corriendo" -ForegroundColor Gray
    Write-Host ""
}

if (-not $port3001) {
    Write-Host '[ADVERTENCIA] Puerto 3001 no esta en escucha' -ForegroundColor Yellow
    Write-Host "Asegurate de que el backend este corriendo" -ForegroundColor Gray
    Write-Host ""
}

# Detener tuneles existentes primero
Write-Host "Verificando y deteniendo tuneles existentes..." -ForegroundColor Yellow
Write-Host ""

# Detener procesos de ngrok locales (mas agresivo)
$ngrokProcesses = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Write-Host "Deteniendo procesos locales de ngrok..." -ForegroundColor Yellow
    $ngrokProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Intentar detener tuneles activos via API local de ngrok (puertos 4040 y 4041)
$apiPorts = @(4040, 4041)
foreach ($port in $apiPorts) {
    $apiResponse = $null
    try {
        $apiUrl = "http://localhost:$port/api/tunnels"
        $apiResponse = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction SilentlyContinue -TimeoutSec 2
    }
    catch {
        # La API no esta disponible en este puerto
        $null = $_
    }
    if ($apiResponse -ne $null -and $apiResponse.tunnels -ne $null -and $apiResponse.tunnels.Count -gt 0) {
        Write-Host "Deteniendo tuneles activos via API (puerto $port)..." -ForegroundColor Yellow
        foreach ($tunnel in $apiResponse.tunnels) {
            try {
                $deleteUrl = "http://localhost:$port/api/tunnels/$($tunnel.name)"
                Invoke-RestMethod -Uri $deleteUrl -Method Delete -ErrorAction SilentlyContinue -TimeoutSec 2
                Write-Host "  [OK] Tunel $($tunnel.name) detenido" -ForegroundColor Green
            }
            catch {
                # Ignorar errores si el tunel ya no existe
                $null = $_
            }
        }
    }
}

# Esperar un poco mas para asegurar que los procesos se detuvieron
Start-Sleep -Seconds 3

# Verificar una vez mas y matar cualquier proceso restante
$remainingProcesses = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($remainingProcesses) {
    Write-Host "Forzando detencion de procesos restantes..." -ForegroundColor Yellow
    $remainingProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host '[OK] Procesos y tuneles locales detenidos' -ForegroundColor Green
Write-Host ""

# Verificar que existe el archivo ngrok.yml
$ngrokConfigPath = Join-Path $rootPath "ngrok.yml"
if (-not (Test-Path $ngrokConfigPath)) {
    Write-Host '[ERROR] No se encontro el archivo ngrok.yml' -ForegroundColor Red
    Write-Host "El archivo debe estar en: $ngrokConfigPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SOLUCION: El archivo ngrok.yml deberia haberse creado automaticamente." -ForegroundColor Cyan
    Write-Host "Si no existe, ejecuta: .\start-ngrok-unified.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host '[OK] Archivo de configuracion encontrado: ngrok.yml' -ForegroundColor Green
Write-Host ""

# Verificar authtoken en el archivo de configuracion
$configContent = Get-Content $ngrokConfigPath -Raw
if ($configContent -notmatch "authtoken:\s*[^\s#]") {
    Write-Host '[ADVERTENCIA] No se encontro authtoken en ngrok.yml' -ForegroundColor Yellow
    Write-Host "Para usar el plan gratuito con multiples tuneles, necesitas configurar authtoken:" -ForegroundColor Cyan
    Write-Host "  1. Ve a https://dashboard.ngrok.com" -ForegroundColor Gray
    Write-Host "  2. Obten tu authtoken" -ForegroundColor Gray
    Write-Host "  3. Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
    Write-Host ""
    Write-Host "Continuando sin authtoken (puede tener limitaciones)..." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Iniciando tuneles ngrok en una sola sesion..." -ForegroundColor Green
Write-Host ""
Write-Host "Esto creara URLs publicas que puedes compartir." -ForegroundColor Yellow
Write-Host "Las URLs se mostraran en la ventana de ngrok." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Cyan
Write-Host "  - Frontend: Puerto 3000" -ForegroundColor Gray
Write-Host "  - Backend: Puerto 3001" -ForegroundColor Gray
Write-Host "  - Ambos tuneles en UNA SOLA sesion de agente" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona Ctrl+C en la ventana de ngrok para detener los tuneles." -ForegroundColor Gray
Write-Host ""

# Iniciar ngrok con todos los tuneles definidos en ngrok.yml
# Usar --all para iniciar todos los tuneles definidos en el archivo de configuracion
$ngrokConfigArg = "--config=$ngrokConfigPath"
$commandParts = @(
    "Write-Host '========================================' -ForegroundColor Cyan"
    "Write-Host '  ngrok - Tuneles Unificados' -ForegroundColor Cyan"
    "Write-Host '========================================' -ForegroundColor Cyan"
    "Write-Host ''"
    "Write-Host 'Frontend (puerto 3000) y Backend (puerto 3001)' -ForegroundColor Yellow"
    "Write-Host 'Ambos tuneles en una sola sesion de agente' -ForegroundColor Gray"
    "Write-Host ''"
    "Write-Host 'URLs publicas:' -ForegroundColor Yellow"
    "Write-Host 'Revisa la interfaz web en http://localhost:4040' -ForegroundColor Gray"
    "Write-Host 'o las URLs que aparecen abajo' -ForegroundColor Gray"
    "Write-Host ''"
)
$command = $commandParts -join "; "
$command += "; ngrok start --all $ngrokConfigArg"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $command

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tuneles Iniciados" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Revisa las ventanas de ngrok para ver las URLs publicas." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "  1. Copia las URLs de las ventanas de ngrok" -ForegroundColor Gray
Write-Host "  2. La URL del frontend es para acceder a la aplicacion" -ForegroundColor Gray
Write-Host "  3. La URL del backend se necesita configurar en el frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "Para configurar el backend en el frontend:" -ForegroundColor Cyan
Write-Host "  Edita apps/web/.env.local y agrega:" -ForegroundColor Gray
Write-Host "  NEXT_PUBLIC_API_URL=https://TU_URL_NGROK_BACKEND" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
