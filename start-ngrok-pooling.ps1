# Script alternativo que usa pooling para evitar conflictos
# Usa este si start-ngrok.ps1 sigue dando error ERR_NGROK_334

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando ngrok con Pooling" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTA: Este script usa pooling, lo que significa que" -ForegroundColor Yellow
Write-Host "ambos tuneles pueden compartir el mismo endpoint." -ForegroundColor Yellow
Write-Host "Esto puede causar problemas si accedes desde la misma URL." -ForegroundColor Yellow
Write-Host ""

# Verificar que ngrok este instalado
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "[ERROR] ngrok no esta instalado" -ForegroundColor Red
    Write-Host "Ejecuta primero: .\setup-ngrok.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Detener tuneles existentes
Write-Host "Deteniendo tuneles existentes..." -ForegroundColor Yellow
.\stop-ngrok.ps1
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Iniciando tuneles con pooling..." -ForegroundColor Green
Write-Host ""

# Iniciar ngrok para frontend con pooling
Write-Host "Iniciando tunel para Frontend (puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '  ngrok Tunnel - Frontend (Puerto 3000)' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'URL publica para Frontend:' -ForegroundColor Yellow; Write-Host 'Comparte esta URL con cualquier dispositivo' -ForegroundColor Gray; Write-Host ''; ngrok http 3000 --pooling-enabled"

# Esperar antes de iniciar el segundo tunel
Start-Sleep -Seconds 5

# Iniciar ngrok para backend con pooling
Write-Host "Iniciando tunel para Backend (puerto 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '  ngrok Tunnel - Backend (Puerto 3001)' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'URL publica para Backend API:' -ForegroundColor Yellow; Write-Host 'Esta URL se usara para las llamadas API' -ForegroundColor Gray; Write-Host ''; ngrok http 3001 --pooling-enabled"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tuneles Iniciados (con Pooling)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ADVERTENCIA: Con pooling, ambos tuneles pueden usar la misma URL." -ForegroundColor Yellow
Write-Host "Si ambos tuneles tienen la misma URL, necesitaras usar diferentes regiones." -ForegroundColor Yellow
Write-Host ""
Write-Host "Revisa las ventanas de ngrok para ver las URLs publicas." -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


