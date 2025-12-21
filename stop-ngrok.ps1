# Script para detener todos los tuneles de ngrok

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deteniendo Tuneles de ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que ngrok este instalado
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "[ERROR] ngrok no esta instalado" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Detener todos los procesos de ngrok
$ngrokProcesses = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Write-Host "Deteniendo procesos de ngrok..." -ForegroundColor Yellow
    $ngrokProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "[OK] Procesos de ngrok detenidos" -ForegroundColor Green
}
else {
    Write-Host "[INFO] No hay procesos de ngrok corriendo localmente" -ForegroundColor Gray
}

# Intentar detener tuneles via API local (puertos 4040 y 4041)
Write-Host "Verificando tuneles activos via API..." -ForegroundColor Yellow
$apiPorts = @(4040, 4041)
$tunnelsFound = $false

foreach ($port in $apiPorts) {
    try {
        $apiResponse = Invoke-RestMethod -Uri "http://localhost:$port/api/tunnels" -Method Get -ErrorAction SilentlyContinue -TimeoutSec 2
        if ($apiResponse.tunnels -and $apiResponse.tunnels.Count -gt 0) {
            $tunnelsFound = $true
            Write-Host "Deteniendo tuneles activos en puerto $port..." -ForegroundColor Yellow
            foreach ($tunnel in $apiResponse.tunnels) {
                try {
                    Invoke-RestMethod -Uri "http://localhost:$port/api/tunnels/$($tunnel.name)" -Method Delete -ErrorAction SilentlyContinue -TimeoutSec 2
                    Write-Host "  [OK] Tunel $($tunnel.name) detenido" -ForegroundColor Green
                }
                catch {
                    Write-Host "  [INFO] Tunel $($tunnel.name) ya estaba detenido o no se pudo detener" -ForegroundColor Gray
                }
            }
        }
    }
    catch {
        # La API no esta disponible en este puerto
    }
}

if (-not $tunnelsFound) {
    Write-Host "[INFO] No se encontraron tuneles activos via API local" -ForegroundColor Gray
}

# Verificar procesos restantes
Start-Sleep -Seconds 2
$remainingProcesses = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($remainingProcesses) {
    Write-Host "Forzando detencion de procesos restantes..." -ForegroundColor Yellow
    $remainingProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "Si aun ves el error ERR_NGROK_334, puede haber tuneles activos en el dashboard de ngrok." -ForegroundColor Gray
Write-Host "Ve a https://dashboard.ngrok.com/status/tunnels y detenlos manualmente." -ForegroundColor Gray
Write-Host ""

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tuneles Detenidos" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes ejecutar .\start-ngrok.ps1 de nuevo" -ForegroundColor Yellow
Write-Host ""


