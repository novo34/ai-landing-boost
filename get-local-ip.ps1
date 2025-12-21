# Script para obtener la IP local de la maquina
# Util para acceder al sistema desde otros dispositivos en la red

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Obteniendo IP Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener todas las IPs IPv4, excluyendo loopback, link-local y WSL/Hyper-V
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
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
} | Select-Object IPAddress, InterfaceAlias, PrefixLength

if ($ipAddresses) {
    Write-Host "IPs locales encontradas:" -ForegroundColor Green
    Write-Host ""
    
    foreach ($ip in $ipAddresses) {
        $subnet = "/$($ip.PrefixLength)"
        Write-Host "  IP: " -NoNewline -ForegroundColor Yellow
        Write-Host "$($ip.IPAddress)$subnet" -ForegroundColor White
        Write-Host "  Interfaz: $($ip.InterfaceAlias)" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Priorizar Wi-Fi o Ethernet sobre otras interfaces
    $primaryIp = $ipAddresses | Where-Object { 
        $_.InterfaceAlias -like "*Wi-Fi*" -or 
        $_.InterfaceAlias -like "*Ethernet*" -or
        $_.InterfaceAlias -like "*LAN*"
    } | Select-Object -First 1
    
    # Si no hay Wi-Fi/Ethernet, usar la primera disponible
    if (-not $primaryIp) {
        $primaryIp = $ipAddresses | Select-Object -First 1
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  IP Principal Recomendada" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  $($primaryIp.IPAddress)" -ForegroundColor Green -BackgroundColor Black
    Write-Host "  Interfaz: $($primaryIp.InterfaceAlias)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "URLs de acceso desde otros dispositivos:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://$($primaryIp.IPAddress):3000" -ForegroundColor Yellow
    Write-Host "  Backend:  http://$($primaryIp.IPAddress):3001" -ForegroundColor Yellow
    Write-Host ""
}
else {
    Write-Host "No se encontraron IPs locales validas." -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "  1. Estes conectado a una red (WiFi o Ethernet)" -ForegroundColor Gray
    Write-Host "  2. La conexion tenga una IP asignada" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Intenta ejecutar: ipconfig" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""


