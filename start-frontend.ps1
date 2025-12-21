# Script para iniciar el frontend
# Verifica si el backend esta corriendo y lo inicia si es necesario

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si el backend esta corriendo
$backendRunning = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

if (-not $backendRunning) {
    Write-Host "[ADVERTENCIA] El backend no esta corriendo en el puerto 3001" -ForegroundColor Yellow
    Write-Host "Iniciando backend automaticamente..." -ForegroundColor Cyan
    Write-Host ""
    
    # Iniciar backend en una nueva ventana
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\apps\api'; Write-Host 'Backend iniciando...' -ForegroundColor Green; pnpm run start:dev"
    
    # Esperar a que el backend inicie
    Write-Host "Esperando a que el backend inicie..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    $backendStarted = $false
    
    while ($attempt -lt $maxAttempts -and -not $backendStarted) {
        Start-Sleep -Seconds 2
        $backendRunning = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
        if ($backendRunning) {
            $backendStarted = $true
            Write-Host "[OK] Backend iniciado correctamente" -ForegroundColor Green
        }
        else {
            $attempt++
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    
    if (-not $backendStarted) {
        Write-Host "[ADVERTENCIA] El backend no inicio en el tiempo esperado" -ForegroundColor Yellow
        Write-Host "Puedes iniciarlo manualmente con: .\start-backend.ps1" -ForegroundColor Gray
        Write-Host ""
    }
}
else {
    Write-Host "[OK] Backend ya esta corriendo" -ForegroundColor Green
    Write-Host ""
}

# Cambiar al directorio del frontend
Set-Location "apps\web"

Write-Host "Iniciando frontend en http://0.0.0.0:3000..." -ForegroundColor Green
Write-Host "Accesible desde otros dispositivos en la red local" -ForegroundColor Yellow
Write-Host ""
pnpm run dev

