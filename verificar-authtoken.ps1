# Script para verificar que el authtoken de ngrok está configurado

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Authtoken ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que ngrok esté instalado
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "[ERROR] ngrok no está instalado" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] ngrok está instalado" -ForegroundColor Green
Write-Host ""

# Verificar archivos de configuración de ngrok
$ngrokConfigPaths = @(
    "$env:LOCALAPPDATA\ngrok\ngrok.yml",
    "$env:USERPROFILE\.ngrok2\ngrok.yml",
    "$env:APPDATA\ngrok\ngrok.yml"
)

$configFound = $false
$hasAuthtoken = $false
$configPath = $null

foreach ($path in $ngrokConfigPaths) {
    if (Test-Path $path) {
        $configFound = $true
        $configPath = $path
        $content = Get-Content $path -Raw -ErrorAction SilentlyContinue
        if ($content -and $content -match "authtoken:\s*([^\s#]+)") {
            $hasAuthtoken = $true
            $token = $matches[1]
            Write-Host "[OK] Authtoken configurado" -ForegroundColor Green
            Write-Host "  Archivo: $path" -ForegroundColor Gray
            Write-Host "  Token: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Gray
            break
        }
    }
}

if (-not $configFound) {
    Write-Host "[ADVERTENCIA] No se encontró archivo de configuración de ngrok" -ForegroundColor Yellow
    Write-Host "Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor Cyan
}
elseif (-not $hasAuthtoken) {
    Write-Host "[ADVERTENCIA] No se encontró authtoken en el archivo de configuración" -ForegroundColor Yellow
    Write-Host "  Archivo: $configPath" -ForegroundColor Gray
    Write-Host "Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación Completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
