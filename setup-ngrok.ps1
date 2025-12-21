# Script para configurar ngrok para acceso remoto
# Permite que dispositivos desde cualquier lugar accedan al sistema

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracion de ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ngrok permite exponer tu servidor local a Internet" -ForegroundColor Yellow
Write-Host "para que cualquier dispositivo pueda acceder desde cualquier lugar." -ForegroundColor Yellow
Write-Host ""

# Verificar si ngrok esta instalado
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "[INFO] ngrok no esta instalado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcion 1: Instalacion automatica (recomendado)" -ForegroundColor Cyan
    Write-Host "  Ejecuta este comando en PowerShell como administrador:" -ForegroundColor Gray
    Write-Host "  winget install ngrok" -ForegroundColor White
    Write-Host ""
    Write-Host "Opcion 2: Instalacion manual" -ForegroundColor Cyan
    Write-Host "  1. Ve a https://ngrok.com/download" -ForegroundColor Gray
    Write-Host "  2. Descarga ngrok para Windows" -ForegroundColor Gray
    Write-Host "  3. Extrae ngrok.exe a una carpeta en tu PATH" -ForegroundColor Gray
    Write-Host "     (ej: C:\Windows\System32 o crea C:\ngrok y agregalo al PATH)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Opcion 3: Usar Chocolatey (si lo tienes instalado)" -ForegroundColor Cyan
    Write-Host "  choco install ngrok" -ForegroundColor White
    Write-Host ""
    Write-Host "Despues de instalar, ejecuta este script de nuevo." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[OK] ngrok esta instalado" -ForegroundColor Green
Write-Host ""

# Verificar si ngrok tiene authtoken configurado
# ngrok puede usar diferentes ubicaciones para el archivo de configuracion
$ngrokConfigPaths = @(
    "$env:LOCALAPPDATA\ngrok\ngrok.yml",  # Nueva ubicacion (ngrok 3.x)
    "$env:USERPROFILE\.ngrok2\ngrok.yml",  # Ubicacion antigua (ngrok 2.x)
    "$env:APPDATA\ngrok\ngrok.yml"
)

$configFound = $false
$hasAuthtoken = $false

foreach ($configPath in $ngrokConfigPaths) {
    if (Test-Path $configPath) {
        $configFound = $true
        $configContent = Get-Content $configPath -Raw -ErrorAction SilentlyContinue
        if ($configContent -and $configContent -match "authtoken:") {
            $hasAuthtoken = $true
            Write-Host "[OK] ngrok tiene authtoken configurado" -ForegroundColor Green
            Write-Host "  Archivo: $configPath" -ForegroundColor Gray
            break
        }
    }
}

if (-not $configFound) {
    Write-Host "[INFO] ngrok no tiene archivo de configuracion" -ForegroundColor Yellow
    Write-Host "Puedes configurar authtoken ejecutando:" -ForegroundColor Cyan
    Write-Host "  ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
    Write-Host ""
}
elseif (-not $hasAuthtoken) {
    Write-Host "[ADVERTENCIA] ngrok no tiene authtoken configurado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para usar ngrok de forma gratuita, necesitas:" -ForegroundColor Cyan
    Write-Host "  1. Crear una cuenta en https://ngrok.com (gratis)" -ForegroundColor Gray
    Write-Host "  2. Obtener tu authtoken desde el dashboard" -ForegroundColor Gray
    Write-Host "  3. Ejecutar: ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
    Write-Host ""
    Write-Host "Sin authtoken, ngrok funcionara pero con limitaciones:" -ForegroundColor Yellow
    Write-Host "  - URLs temporales que cambian cada vez" -ForegroundColor Gray
    Write-Host "  - Limite de conexiones" -ForegroundColor Gray
    Write-Host "  - Timeout despues de 2 horas" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracion Completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar ngrok, ejecuta:" -ForegroundColor Cyan
Write-Host "  .\start-ngrok.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Esto creara URLs publicas que puedes compartir con cualquier dispositivo." -ForegroundColor Yellow
Write-Host ""


