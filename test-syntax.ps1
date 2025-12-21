# Script para iniciar ngrok y exponer el sistema a Internet
# Crea URLs publicas que funcionan desde cualquier lugar
# 
# IMPORTANTE: Este script ahora usa UNA SOLA sesiÃ³n de agente de ngrok
# para evitar el error ERR_NGROK_334 en el plan gratuito.
# El plan gratuito permite hasta 3 endpoints, pero solo 1 sesiÃ³n de agente a la vez.

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando ngrok Tunnel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SOLUCIÃ“N PARA ERR_NGROK_334:" -ForegroundColor Yellow
Write-Host "Usando configuraciÃ³n unificada (una sola sesiÃ³n de agente)" -ForegroundColor Yellow
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

# Detener procesos de ngrok locales (mÃ¡s agresivo)
$ngrokProcesses = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Write-Host "Deteniendo procesos locales de ngrok..." -ForegroundColor Yellow
    $ngrokProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Intentar detener tuneles activos via API local de ngrok (puertos 4040 y 4041)
$apiPorts = @(4040, 4041)
foreach ($port in $apiPorts) {
    try {
        $apiResponse = Invoke-RestMethod -Uri "http://localhost:$port/api/tunnels" -Method Get -ErrorAction SilentlyContinue -TimeoutSec 2
        if ($apiResponse.tunnels -and $apiResponse.tunnels.Count -gt 0) {
            Write-Host "Deteniendo tuneles activos via API (puerto $port)..." -ForegroundColor Yellow
            foreach ($tunnel in $apiResponse.tunnels) {
                try {
                    Invoke-RestMethod -Uri "http://localhost:$port/api/tunnels/$($tunnel.name)" -Method Delete -ErrorAction SilentlyContinue -TimeoutSec 2
                    Write-Host "  [OK] Tunel $($tunnel.name) detenido" -ForegroundColor Green
                }
                catch {
                    # Ignorar errores si el tunel ya no existe
                }
            }
        }
    }
    catch {
        # La API no esta disponible en este puerto
    }
}

# Esperar un poco mÃ¡s para asegurar que los procesos se detuvieron
Start-Sleep -Seconds 3

# Verificar una vez mÃ¡s y matar cualquier proceso restante
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
if (-not (Test-Path $ngrokConfigPath))
{
    Write-Host '[ERROR] No se encontrÃ³ el archivo ngrok.yml' -ForegroundColor Red
    Write-Host "El archivo debe estar en: $ngrokConfigPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SOLUCIÃ“N: El archivo ngrok.yml deberÃ­a haberse creado automÃ¡ticamente." -ForegroundColor Cyan
    Write-Host "Si no existe, ejecuta: .\start-ngrok-unified.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
