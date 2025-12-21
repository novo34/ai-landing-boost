# Script para detener un túnel específico de ngrok usando la API local

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Detener Tunel de ngrok via API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que ngrok esté corriendo
try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
    Write-Host "[OK] Conectado a la API de ngrok" -ForegroundColor Green
    Write-Host ""
    
    if ($tunnels.tunnels -and $tunnels.tunnels.Count -gt 0) {
        Write-Host "Tuneles activos encontrados:" -ForegroundColor Yellow
        Write-Host ""
        
        for ($i = 0; $i -lt $tunnels.tunnels.Count; $i++) {
            $tunnel = $tunnels.tunnels[$i]
            Write-Host "$($i + 1). $($tunnel.name)" -ForegroundColor Cyan
            Write-Host "   URL: $($tunnel.public_url)" -ForegroundColor Gray
            Write-Host "   Puerto local: $($tunnel.config.addr)" -ForegroundColor Gray
            Write-Host ""
        }
        
        Write-Host "Selecciona el numero del tunel que deseas detener (o 0 para cancelar):" -ForegroundColor Yellow
        $selection = Read-Host
        
        if ($selection -eq "0" -or $selection -eq "") {
            Write-Host "Operacion cancelada" -ForegroundColor Gray
            exit 0
        }
        
        $tunnelIndex = [int]$selection - 1
        if ($tunnelIndex -ge 0 -and $tunnelIndex -lt $tunnels.tunnels.Count) {
            $selectedTunnel = $tunnels.tunnels[$tunnelIndex]
            Write-Host ""
            Write-Host "Deteniendo tunel: $($selectedTunnel.name)..." -ForegroundColor Yellow
            
            try {
                Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels/$($selectedTunnel.name)" -Method Delete -ErrorAction Stop
                Write-Host "[OK] Tunel detenido exitosamente" -ForegroundColor Green
            }
            catch {
                Write-Host "[ERROR] No se pudo detener el tunel: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        else {
            Write-Host "[ERROR] Seleccion invalida" -ForegroundColor Red
        }
    }
    else {
        Write-Host "[INFO] No hay tuneles activos" -ForegroundColor Gray
    }
}
catch {
    Write-Host "[ERROR] No se pudo conectar a la API de ngrok" -ForegroundColor Red
    Write-Host "Asegurate de que ngrok este corriendo" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternativas:" -ForegroundColor Cyan
    Write-Host "  1. Ejecuta .\stop-ngrok.ps1 para detener procesos locales" -ForegroundColor Gray
    Write-Host "  2. Ve a https://dashboard.ngrok.com para detener tuneles desde el dashboard" -ForegroundColor Gray
    Write-Host "  3. Espera 3-5 minutos para que los tuneles se liberen automaticamente" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


