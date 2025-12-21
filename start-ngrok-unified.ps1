# Script para iniciar ngrok con UNA SOLA SESIÓN DE AGENTE
# Esto resuelve el problema ERR_NGROK_334 en el plan gratuito
# El plan gratuito permite hasta 3 endpoints, pero solo 1 sesión de agente a la vez

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando ngrok (Sesión Unificada)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SOLUCIÓN PARA ERR_NGROK_334:" -ForegroundColor Yellow
Write-Host "Este script usa UNA SOLA sesión de agente de ngrok" -ForegroundColor Yellow
Write-Host "con múltiples túneles, lo cual es compatible con el plan gratuito." -ForegroundColor Yellow
Write-Host ""

# Verificar que ngrok esté instalado
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "[ERROR] ngrok no está instalado" -ForegroundColor Red
    Write-Host "Ejecuta primero: .\setup-ngrok.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Verificar que los servidores estén corriendo
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

if (-not $port3000) {
    Write-Host "[ADVERTENCIA] Puerto 3000 no está en escucha" -ForegroundColor Yellow
    Write-Host "Asegúrate de que el frontend esté corriendo" -ForegroundColor Gray
    Write-Host ""
}

if (-not $port3001) {
    Write-Host "[ADVERTENCIA] Puerto 3001 no está en escucha" -ForegroundColor Yellow
    Write-Host "Asegúrate de que el backend esté corriendo" -ForegroundColor Gray
    Write-Host ""
}

# Detener túneles existentes primero
Write-Host "Verificando y deteniendo túneles existentes..." -ForegroundColor Yellow
Write-Host ""

# Detener procesos de ngrok locales
$ngrokProcesses = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Write-Host "Deteniendo procesos locales de ngrok..." -ForegroundColor Yellow
    $ngrokProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Intentar detener túneles activos via API local de ngrok
$apiPorts = @(4040, 4041)
foreach ($port in $apiPorts) {
    try {
        $apiResponse = Invoke-RestMethod -Uri "http://localhost:$port/api/tunnels" -Method Get -ErrorAction SilentlyContinue -TimeoutSec 2
        if ($apiResponse.tunnels -and $apiResponse.tunnels.Count -gt 0) {
            Write-Host "Deteniendo túneles activos via API (puerto $port)..." -ForegroundColor Yellow
            foreach ($tunnel in $apiResponse.tunnels) {
                try {
                    Invoke-RestMethod -Uri "http://localhost:$port/api/tunnels/$($tunnel.name)" -Method Delete -ErrorAction SilentlyContinue -TimeoutSec 2
                    Write-Host "  [OK] Túnel $($tunnel.name) detenido" -ForegroundColor Green
                }
                catch {
                    # Ignorar errores si el túnel ya no existe
                }
            }
        }
    }
    catch {
        # La API no está disponible en este puerto
    }
}

# Esperar un poco más para asegurar que los procesos se detuvieron
Start-Sleep -Seconds 3

# Verificar una vez más y matar cualquier proceso restante
$remainingProcesses = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($remainingProcesses) {
    Write-Host "Forzando detención de procesos restantes..." -ForegroundColor Yellow
    $remainingProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "[OK] Procesos y túneles locales detenidos" -ForegroundColor Green
Write-Host ""

# Verificar que existe el archivo ngrok.yml
$ngrokConfigPath = Join-Path $rootPath "ngrok.yml"
if (-not (Test-Path $ngrokConfigPath)) {
    Write-Host "[ERROR] No se encontró el archivo ngrok.yml" -ForegroundColor Red
    Write-Host "El archivo debe estar en: $ngrokConfigPath" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[OK] Archivo de configuración encontrado: ngrok.yml" -ForegroundColor Green
Write-Host ""

# Verificar authtoken en el archivo de configuración
$configContent = Get-Content $ngrokConfigPath -Raw
if ($configContent -notmatch "authtoken:\s*[^\s#]") {
    Write-Host "[ADVERTENCIA] No se encontró authtoken en ngrok.yml" -ForegroundColor Yellow
    Write-Host "Para usar el plan gratuito con múltiples túneles, necesitas configurar authtoken:" -ForegroundColor Cyan
    Write-Host "  1. Ve a https://dashboard.ngrok.com" -ForegroundColor Gray
    Write-Host "  2. Obtén tu authtoken" -ForegroundColor Gray
    Write-Host "  3. Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
    Write-Host ""
    Write-Host "Continuando sin authtoken (puede tener limitaciones)..." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Iniciando túneles ngrok en una sola sesión..." -ForegroundColor Green
Write-Host ""
Write-Host "Esto creará URLs públicas que puedes compartir." -ForegroundColor Yellow
Write-Host "Las URLs se mostrarán en la ventana de ngrok." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Cyan
Write-Host "  - Frontend: Puerto 3000" -ForegroundColor Gray
Write-Host "  - Backend: Puerto 3001" -ForegroundColor Gray
Write-Host "  - Ambos túneles en UNA SOLA sesión de agente" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona Ctrl+C en la ventana de ngrok para detener los túneles." -ForegroundColor Gray
Write-Host ""

# Iniciar ngrok con todos los túneles definidos en ngrok.yml
# Usar --all para iniciar todos los túneles definidos en el archivo de configuración
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '  ngrok - Túneles Unificados' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Frontend (puerto 3000) y Backend (puerto 3001)' -ForegroundColor Yellow; Write-Host 'Ambos túneles en una sola sesión de agente' -ForegroundColor Gray; Write-Host ''; Write-Host 'URLs públicas:' -ForegroundColor Yellow; Write-Host 'Revisa la interfaz web en http://localhost:4040' -ForegroundColor Gray; Write-Host 'o las URLs que aparecen abajo' -ForegroundColor Gray; Write-Host ''; ngrok start --all --config=`"$ngrokConfigPath`""

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Túneles Iniciados" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Revisa la ventana de ngrok para ver las URLs públicas." -ForegroundColor Yellow
Write-Host "También puedes ver la interfaz web en: http://localhost:4040" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "  1. Copia las URLs de la ventana de ngrok" -ForegroundColor Gray
Write-Host "  2. La URL del frontend es para acceder a la aplicación" -ForegroundColor Gray
Write-Host "  3. La URL del backend se necesita configurar en el frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "Para configurar el backend en el frontend:" -ForegroundColor Cyan
Write-Host "  Edita apps/web/.env.local y agrega:" -ForegroundColor Gray
Write-Host "  NEXT_PUBLIC_API_URL=https://TU_URL_NGROK_BACKEND" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
