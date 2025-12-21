# Script alternativo para iniciar ngrok de forma mas simple
# Usa un solo tunel y hace proxy del backend a traves del frontend
# O usa diferentes subdominios

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando ngrok (Modo Simple)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que ngrok este instalado
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "[ERROR] ngrok no esta instalado" -ForegroundColor Red
    Write-Host "Ejecuta primero: .\setup-ngrok.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Detener todos los procesos de ngrok primero
Write-Host "Deteniendo tuneles existentes..." -ForegroundColor Yellow
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Verificar que los servidores esten corriendo
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

if (-not $port3000) {
    Write-Host "[ADVERTENCIA] Puerto 3000 no esta en escucha" -ForegroundColor Yellow
    Write-Host "Asegurate de que el frontend este corriendo" -ForegroundColor Gray
    Write-Host ""
}

if (-not $port3001) {
    Write-Host "[ADVERTENCIA] Puerto 3001 no esta en escucha" -ForegroundColor Yellow
    Write-Host "Asegurate de que el backend este corriendo" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Opciones disponibles:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Dos tuneles separados (recomendado si tienes authtoken)" -ForegroundColor Yellow
Write-Host "2. Un solo tunel para frontend + proxy al backend" -ForegroundColor Yellow
Write-Host ""
$opcion = Read-Host "Selecciona opcion (1 o 2)"

if ($opcion -eq "2") {
    Write-Host ""
    Write-Host "Iniciando tunel unico para Frontend..." -ForegroundColor Green
    Write-Host "NOTA: Necesitaras configurar el frontend para hacer proxy al backend" -ForegroundColor Yellow
    Write-Host ""
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '  ngrok Tunnel - Frontend (Puerto 3000)' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'URL publica:' -ForegroundColor Yellow; Write-Host 'Comparte esta URL con cualquier dispositivo' -ForegroundColor Gray; Write-Host ''; ngrok http 3000"
}
else {
    Write-Host ""
    Write-Host "Iniciando tuneles separados..." -ForegroundColor Green
    Write-Host ""
    
    # Intentar con diferentes estrategias para evitar conflictos
    Write-Host "Tunel Frontend (puerto 3000)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '  ngrok Tunnel - Frontend' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'URL publica para Frontend:' -ForegroundColor Yellow; Write-Host ''; ngrok http 3000 --pooling-enabled"
    
    Start-Sleep -Seconds 5
    
    Write-Host "Tunel Backend (puerto 3001)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '========================================' -ForegroundColor Cyan; Write-Host '  ngrok Tunnel - Backend' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'URL publica para Backend:' -ForegroundColor Yellow; Write-Host ''; ngrok http 3001 --pooling-enabled"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tuneles Iniciados" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Revisa las ventanas de ngrok para ver las URLs publicas." -ForegroundColor Yellow
Write-Host ""
Write-Host "Si ves el error ERR_NGROK_334:" -ForegroundColor Red
Write-Host "  1. Ve a https://dashboard.ngrok.com/status/tunnels" -ForegroundColor Gray
Write-Host "  2. Detiene manualmente los tuneles activos" -ForegroundColor Gray
Write-Host "  3. O espera unos minutos y vuelve a intentar" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


