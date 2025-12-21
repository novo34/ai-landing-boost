<# 
start-ngrok.ps1
- Crea/usa ngrok.yml
- Levanta UNA sola sesión: ngrok start --all
- Evita ERR_NGROK_334

Ejecutar:
  powershell -ExecutionPolicy Bypass -File .\start-ngrok.ps1
#>

param(
    [int]$FrontendPort = 3000,
    [int]$BackendPort = 3001,
    [string]$WebName = "web",
    [string]$ApiName = "api",
    [string]$Region = "",
    [switch]$OpenDashboard
)

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
        Write-Host "ERROR: No se encontró '$cmd' en tu PATH." -ForegroundColor Red
        Write-Host "Instala ngrok y vuelve a intentar." -ForegroundColor Yellow
        Write-Host "Tip: winget install ngrok.ngrok" -ForegroundColor Gray
        exit 1
    }
}

function Ensure-NgrokConfig(
    [string]$configPath,
    [string]$webName,
    [string]$apiName,
    [int]$frontendPort,
    [int]$backendPort,
    [string]$region
) {
    if (-not (Test-Path $configPath)) {
        Write-Host "No existe ngrok.yml. Creándolo en: $configPath" -ForegroundColor Yellow

        $regionLine = ""
        if ($region -and $region.Trim().Length -gt 0) {
            $regionLine = "region: $region`n"
        }

        # IMPORTANTE: usar ${webName}: y ${apiName}: para evitar el parser de PowerShell con :
        $yaml = @"
version: "3"
$regionLine`tunnels:
  ${webName}:
    proto: http
    addr: http://localhost:$frontendPort
  ${apiName}:
    proto: http
    addr: http://localhost:$backendPort
"@

        $yaml | Set-Content -Path $configPath -Encoding UTF8
    }
    else {
        Write-Host "ngrok.yml encontrado en: $configPath" -ForegroundColor Green
    }
}

# --- Main ---
$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Title "Iniciando ngrok (una sola sesión)"

Require-Command "ngrok"

$ngrokConfigPath = Join-Path $rootPath "ngrok.yml"

Ensure-NgrokConfig -configPath $ngrokConfigPath `
    -webName $WebName -apiName $ApiName `
    -frontendPort $FrontendPort -backendPort $BackendPort `
    -region $Region

Write-Host ""
Write-Host "Puertos:" -ForegroundColor Cyan
Write-Host "  Frontend (${WebName}): http://localhost:$FrontendPort" -ForegroundColor Gray
Write-Host "  Backend  (${ApiName}): http://localhost:$BackendPort" -ForegroundColor Gray
Write-Host "Dashboard ngrok: http://127.0.0.1:4040" -ForegroundColor Gray
Write-Host ""

if ($OpenDashboard) {
    Start-Process "http://127.0.0.1:4040" | Out-Null
}

# Authtoken opcional por variable de entorno
if ($env:NGROK_AUTHTOKEN -and $env:NGROK_AUTHTOKEN.Trim().Length -gt 0) {
    try {
        ngrok config add-authtoken $env:NGROK_AUTHTOKEN | Out-Null
        Write-Host "Authtoken aplicado desde NGROK_AUTHTOKEN." -ForegroundColor Green
    }
    catch {
        Write-Host "Aviso: no se pudo aplicar authtoken automáticamente (si ya está, ignora esto)." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Iniciando ngrok con TODOS los túneles del config..." -ForegroundColor Cyan
Write-Host "Comando: ngrok start --all --config `"$ngrokConfigPath`"" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTA: Si ambos túneles reciben la misma URL, usa: .\start-ngrok-separados.ps1" -ForegroundColor Yellow
Write-Host ""

ngrok start --all --config "$ngrokConfigPath"

Write-Host ""
Write-Host "ngrok se cerró. Presiona cualquier tecla para salir..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
