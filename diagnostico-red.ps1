# Script de diagnostico de red para acceso remoto
# Verifica que todo este configurado correctamente

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnostico de Red Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar IP local
Write-Host "1. Verificando IP local..." -ForegroundColor Yellow
$localIp = $null
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

$wifiIp = $allIps | Where-Object { 
    $_.InterfaceAlias -like "*Wi-Fi*" -or 
    $_.InterfaceAlias -like "*Ethernet*" -or
    $_.InterfaceAlias -like "*LAN*"
} | Select-Object -First 1

if ($wifiIp) {
    $localIp = $wifiIp.IPAddress
    Write-Host "   [OK] IP encontrada: $localIp ($($wifiIp.InterfaceAlias))" -ForegroundColor Green
}
else {
    $firstIp = $allIps | Select-Object -First 1
    if ($firstIp) {
        $localIp = $firstIp.IPAddress
        Write-Host "   [OK] IP encontrada: $localIp ($($firstIp.InterfaceAlias))" -ForegroundColor Green
    }
    else {
        Write-Host "   [ERROR] No se encontro IP de red local" -ForegroundColor Red
        $localIp = $null
    }
}
Write-Host ""

# 2. Verificar firewall
Write-Host "2. Verificando reglas de firewall..." -ForegroundColor Yellow
$rule3000 = Get-NetFirewallRule -DisplayName "Next.js Dev Server" -ErrorAction SilentlyContinue
$rule3001 = Get-NetFirewallRule -DisplayName "NestJS API Dev Server" -ErrorAction SilentlyContinue

if ($rule3000) {
    Write-Host "   [OK] Regla para puerto 3000 existe" -ForegroundColor Green
}
else {
    Write-Host "   [ERROR] Regla para puerto 3000 NO existe" -ForegroundColor Red
    Write-Host "   Ejecuta: .\configure-firewall.ps1 (como administrador)" -ForegroundColor Yellow
}

if ($rule3001) {
    Write-Host "   [OK] Regla para puerto 3001 existe" -ForegroundColor Green
}
else {
    Write-Host "   [ERROR] Regla para puerto 3001 NO existe" -ForegroundColor Red
    Write-Host "   Ejecuta: .\configure-firewall.ps1 (como administrador)" -ForegroundColor Yellow
}
Write-Host ""

# 3. Verificar que los puertos esten escuchando
Write-Host "3. Verificando puertos en escucha..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

if ($port3000) {
    $listeningIp = $port3000.LocalAddress
    if ($listeningIp -eq "0.0.0.0" -or $listeningIp -eq "::") {
        Write-Host "   [OK] Puerto 3000 esta escuchando en todas las interfaces (0.0.0.0)" -ForegroundColor Green
    }
    else {
        Write-Host "   [ADVERTENCIA] Puerto 3000 esta escuchando solo en $listeningIp" -ForegroundColor Yellow
        Write-Host "   Deberia estar en 0.0.0.0 para acceso remoto" -ForegroundColor Yellow
    }
}
else {
    Write-Host "   [ERROR] Puerto 3000 NO esta en escucha" -ForegroundColor Red
    Write-Host "   Asegurate de que el frontend este corriendo" -ForegroundColor Yellow
}

if ($port3001) {
    $listeningIp = $port3001.LocalAddress
    if ($listeningIp -eq "0.0.0.0" -or $listeningIp -eq "::") {
        Write-Host "   [OK] Puerto 3001 esta escuchando en todas las interfaces (0.0.0.0)" -ForegroundColor Green
    }
    else {
        Write-Host "   [ADVERTENCIA] Puerto 3001 esta escuchando solo en $listeningIp" -ForegroundColor Yellow
        Write-Host "   Deberia estar en 0.0.0.0 para acceso remoto" -ForegroundColor Yellow
    }
}
else {
    Write-Host "   [ERROR] Puerto 3001 NO esta en escucha" -ForegroundColor Red
    Write-Host "   Asegurate de que el backend este corriendo" -ForegroundColor Yellow
}
Write-Host ""

# 4. Resumen y URLs
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumen" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($localIp) {
    Write-Host "URLs de acceso desde otros dispositivos:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://$localIp:3000" -ForegroundColor Yellow
    Write-Host "  Backend:  http://$localIp:3001" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Asegurate de que:" -ForegroundColor Cyan
    Write-Host "  1. Ambos dispositivos esten en la misma red WiFi" -ForegroundColor Gray
    Write-Host "  2. Los servidores esten corriendo (.\start-system.ps1)" -ForegroundColor Gray
    Write-Host "  3. El firewall permita conexiones (ya configurado)" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "No se pudo determinar la IP local." -ForegroundColor Red
    Write-Host "Ejecuta: .\get-local-ip.ps1" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""


