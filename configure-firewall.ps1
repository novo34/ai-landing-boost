# Script para configurar el firewall de Windows
# Permite conexiones entrantes en los puertos 3000 y 3001 para desarrollo
# REQUIERE EJECUTAR COMO ADMINISTRADOR

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERROR: Se requieren permisos de administrador" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, ejecuta este script como administrador:" -ForegroundColor Yellow
    Write-Host "  1. Clic derecho en PowerShell" -ForegroundColor Gray
    Write-Host "  2. Selecciona 'Ejecutar como administrador'" -ForegroundColor Gray
    Write-Host "  3. Navega a este directorio y ejecuta el script" -ForegroundColor Gray
    Write-Host ""
    Write-Host "O ejecuta desde PowerShell como admin:" -ForegroundColor Cyan
    Write-Host "  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor White
    Write-Host "  .\configure-firewall.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurando Firewall de Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si las reglas ya existen
$rule3000 = Get-NetFirewallRule -DisplayName "Next.js Dev Server" -ErrorAction SilentlyContinue
$rule3001 = Get-NetFirewallRule -DisplayName "NestJS API Dev Server" -ErrorAction SilentlyContinue

# Configurar puerto 3000 (Frontend)
if ($rule3000) {
    Write-Host "  [OK] Regla para puerto 3000 ya existe" -ForegroundColor Green
}
else {
    try {
        New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Description "Permite acceso al servidor de desarrollo Next.js desde la red local"
        Write-Host "  [OK] Regla creada para puerto 3000 (Frontend)" -ForegroundColor Green
    }
    catch {
        Write-Host "  [ERROR] Error al crear regla para puerto 3000: $_" -ForegroundColor Red
    }
}

# Configurar puerto 3001 (Backend)
if ($rule3001) {
    Write-Host "  [OK] Regla para puerto 3001 ya existe" -ForegroundColor Green
}
else {
    try {
        New-NetFirewallRule -DisplayName "NestJS API Dev Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -Description "Permite acceso al servidor de desarrollo NestJS API desde la red local"
        Write-Host "  [OK] Regla creada para puerto 3001 (Backend)" -ForegroundColor Green
    }
    catch {
        Write-Host "  [ERROR] Error al crear regla para puerto 3001: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracion Completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Los puertos 3000 y 3001 ahora estan abiertos para conexiones entrantes." -ForegroundColor Yellow
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Obten tu IP local: .\get-local-ip.ps1" -ForegroundColor Gray
Write-Host "  2. Inicia el sistema: .\start-system.ps1" -ForegroundColor Gray
Write-Host "  3. Accede desde otro dispositivo usando tu IP local" -ForegroundColor Gray
Write-Host ""
