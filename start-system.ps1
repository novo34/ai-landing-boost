# Script para iniciar el sistema completo (Frontend + Backend)
# Ejecuta ambos servicios en ventanas separadas de PowerShell

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando AI Landing Boost System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cerrar procesos anteriores de Node
Write-Host "Cerrando procesos anteriores..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Obtener IP local (priorizando Wi-Fi/Ethernet sobre WSL/Hyper-V)
$allIps = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceAlias -notlike "*WSL*" -and
    $_.InterfaceAlias -notlike "*Hyper-V*" -and
    $_.InterfaceAlias -notlike "*vEthernet*" -and
    ($_.IPAddress -like "192.168.*" -or 
    $_.IPAddress -like "10.*" -or 
    ($_.IPAddress -like "172.1[6-9].*" -or 
    $_.IPAddress -like "172.2[0-9].*" -or 
    $_.IPAddress -like "172.3[0-1].*"))
}

# Priorizar Wi-Fi o Ethernet
$wifiIp = $allIps | Where-Object { 
    $_.InterfaceAlias -like "*Wi-Fi*" -or 
    $_.InterfaceAlias -like "*Ethernet*" -or
    $_.InterfaceAlias -like "*LAN*"
} | Select-Object -First 1

if ($wifiIp) {
    $localIp = $wifiIp.IPAddress
}
else {
    # Si no hay Wi-Fi/Ethernet, usar la primera disponible
    $firstIp = $allIps | Select-Object -First 1
    if ($firstIp) {
        $localIp = $firstIp.IPAddress
    }
    else {
        $localIp = "localhost"
    }
}

# Iniciar Backend en una nueva ventana
Write-Host "Iniciando Backend (API) en http://0.0.0.0:3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\apps\api'; Write-Host 'Backend iniciando...' -ForegroundColor Green; pnpm run start:dev"

# Esperar un poco antes de iniciar el frontend
Start-Sleep -Seconds 3

# Iniciar Frontend en una nueva ventana
Write-Host "Iniciando Frontend (Web) en http://0.0.0.0:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\apps\web'; Write-Host 'Frontend iniciando...' -ForegroundColor Green; pnpm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sistema iniciado correctamente" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acceso local:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor Yellow
Write-Host ""
if ($localIp -ne "localhost") {
    Write-Host "Acceso desde otros dispositivos en la red:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://$localIp:3000" -ForegroundColor Green
    Write-Host "  Backend:  http://$localIp:3001" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "No se detecto IP de red local." -ForegroundColor Yellow
    Write-Host "Ejecuta .\get-local-ip.ps1 para obtener tu IP manualmente." -ForegroundColor Gray
    Write-Host ""
}
Write-Host "Nota: Asegurate de que el firewall permita conexiones en los puertos 3000 y 3001" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
