<# 
start-ngrok-separados.ps1
- Inicia tuneles de ngrok en procesos SEPARADOS para garantizar URLs diferentes
- Util cuando ngrok start --all asigna la misma URL a ambos tuneles
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Title([string]$text) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ("  " + $text) -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Require-Command([string]$cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: No se encontro '$cmd' en tu PATH." -ForegroundColor Red
        Write-Host "Instala ngrok y vuelve a intentar." -ForegroundColor Yellow
        Write-Host "Tip: winget install ngrok.ngrok" -ForegroundColor Gray
        exit 1
    }
}

# --- Main ---
$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Title "Iniciando ngrok (tuneles separados)"

Require-Command "ngrok"

# Verificar que los servicios esten corriendo
Write-Host "Verificando servicios locales..." -ForegroundColor Cyan

$backendRunning = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
$frontendRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $backendRunning) {
    Write-Host "ERROR: Backend no esta corriendo en puerto 3001" -ForegroundColor Red
    Write-Host "Inicia el backend primero con: .\start-backend.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not $frontendRunning) {
    Write-Host "ADVERTENCIA: Frontend no esta corriendo en puerto 3000" -ForegroundColor Yellow
    Write-Host "Puedes iniciarlo despues con: .\start-frontend.ps1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Puertos:" -ForegroundColor Cyan
Write-Host "  Frontend (web): http://localhost:3000" -ForegroundColor Gray
Write-Host "  Backend  (api): http://localhost:3001" -ForegroundColor Gray
Write-Host ""

# Verificar authtoken
Write-Host "Verificando authtoken..." -ForegroundColor Cyan
try {
    ngrok config check 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ADVERTENCIA: Problema con la configuracion de ngrok" -ForegroundColor Yellow
        Write-Host "Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor Gray
    }
}
catch {
    Write-Host "ADVERTENCIA: No se pudo verificar el authtoken" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Iniciando tuneles en procesos separados..." -ForegroundColor Cyan
Write-Host "Esto garantiza que cada tunel tenga su propia URL unica" -ForegroundColor Gray
Write-Host ""

# Iniciar tunel del backend
Write-Host "Iniciando tunel del BACKEND (puerto 3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    @"
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  ngrok - Backend (Puerto 3001)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'URL publica del BACKEND:' -ForegroundColor Yellow
Write-Host 'Copia esta URL y configurala en apps/web/.env.local como:' -ForegroundColor Gray
Write-Host 'NEXT_PUBLIC_API_URL=https://TU_URL_AQUI' -ForegroundColor White
Write-Host ''
ngrok http 3001 --region eu
"@
)

Start-Sleep -Seconds 3

# Iniciar tunel del frontend
Write-Host "Iniciando tunel del FRONTEND (puerto 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    @"
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  ngrok - Frontend (Puerto 3000)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'URL publica del FRONTEND:' -ForegroundColor Yellow
Write-Host 'Usa esta URL para acceder a la aplicacion desde Internet' -ForegroundColor Gray
Write-Host ''
ngrok http 3000 --region eu
"@
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tuneles Iniciados" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "  1. Revisa las ventanas de ngrok que se abrieron" -ForegroundColor Gray
Write-Host "  2. Copia la URL del BACKEND (puerto 3001)" -ForegroundColor Gray
Write-Host "  3. Configurala en apps/web/.env.local:" -ForegroundColor Gray
Write-Host "     NEXT_PUBLIC_API_URL=https://TU_URL_BACKEND_NGROK" -ForegroundColor White
Write-Host "  4. Reinicia el frontend si ya estaba corriendo" -ForegroundColor Gray
Write-Host ""
Write-Host "Tambien puedes ver las URLs en:" -ForegroundColor Cyan
Write-Host "  - Backend: http://127.0.0.1:4040 (primera ventana)" -ForegroundColor Gray
Write-Host "  - Frontend: http://127.0.0.1:4041 (segunda ventana, si esta disponible)" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
