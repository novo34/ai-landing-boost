# Script para verificar la configuracion de ngrok

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificacion de Configuracion ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar tuneles activos de ngrok
Write-Host "Verificando tuneles activos de ngrok..." -ForegroundColor Yellow
Write-Host ""

try {
    $apiResponse = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get -ErrorAction SilentlyContinue
    if ($apiResponse.tunnels -and $apiResponse.tunnels.Count -gt 0) {
        Write-Host "[OK] Tuneles activos encontrados:" -ForegroundColor Green
        Write-Host ""
        
        $frontendUrl = $null
        $backendUrl = $null
        
        foreach ($tunnel in $apiResponse.tunnels) {
            $publicUrl = $tunnel.public_url
            $localPort = $tunnel.config.addr -replace '.*:', ''
            
            if ($localPort -eq "3000") {
                $frontendUrl = $publicUrl
                Write-Host "  Frontend (puerto 3000):" -ForegroundColor Cyan
                Write-Host "    URL Publica: $publicUrl" -ForegroundColor White
            }
            elseif ($localPort -eq "3001") {
                $backendUrl = $publicUrl
                Write-Host "  Backend (puerto 3001):" -ForegroundColor Cyan
                Write-Host "    URL Publica: $publicUrl" -ForegroundColor White
            }
            Write-Host ""
        }
        
        # Verificar configuracion en .env.local
        Write-Host "Verificando configuracion en apps/web/.env.local..." -ForegroundColor Yellow
        Write-Host ""
        
        $envPath = "apps\web\.env.local"
        if (Test-Path $envPath) {
            $envContent = Get-Content $envPath
            $currentApiUrl = $envContent | Where-Object { $_ -match "^NEXT_PUBLIC_API_URL=" }
            
            if ($currentApiUrl) {
                $currentUrl = $currentApiUrl -replace "NEXT_PUBLIC_API_URL=", ""
                Write-Host "  Configuracion actual:" -ForegroundColor Cyan
                Write-Host "    NEXT_PUBLIC_API_URL=$currentUrl" -ForegroundColor White
                Write-Host ""
                
                if ($backendUrl) {
                    if ($currentUrl -eq $backendUrl) {
                        Write-Host "[OK] La configuracion es correcta!" -ForegroundColor Green
                        Write-Host "  La URL del backend esta configurada correctamente." -ForegroundColor Gray
                    }
                    else {
                        Write-Host "[ADVERTENCIA] La URL configurada no coincide con el tunel activo" -ForegroundColor Yellow
                        Write-Host ""
                        Write-Host "  URL configurada: $currentUrl" -ForegroundColor Gray
                        Write-Host "  URL del backend activo: $backendUrl" -ForegroundColor Gray
                        Write-Host ""
                        Write-Host "  Para corregir, actualiza apps/web/.env.local con:" -ForegroundColor Cyan
                        Write-Host "    NEXT_PUBLIC_API_URL=$backendUrl" -ForegroundColor White
                    }
                }
                else {
                    Write-Host "[ADVERTENCIA] No se encontro tunel activo para el backend (puerto 3001)" -ForegroundColor Yellow
                    Write-Host "  Asegurate de que el tunel del backend este corriendo" -ForegroundColor Gray
                }
            }
            else {
                Write-Host "[ADVERTENCIA] NEXT_PUBLIC_API_URL no esta configurado" -ForegroundColor Yellow
                if ($backendUrl) {
                    Write-Host ""
                    Write-Host "  Agrega esta linea a apps/web/.env.local:" -ForegroundColor Cyan
                    Write-Host "    NEXT_PUBLIC_API_URL=$backendUrl" -ForegroundColor White
                }
            }
        }
        else {
            Write-Host "[INFO] El archivo apps/web/.env.local no existe" -ForegroundColor Gray
            if ($backendUrl) {
                Write-Host ""
                Write-Host "  Crea el archivo con esta configuracion:" -ForegroundColor Cyan
                Write-Host "    NEXT_PUBLIC_API_URL=$backendUrl" -ForegroundColor White
            }
        }
    }
    else {
        Write-Host "[ADVERTENCIA] No se encontraron tuneles activos" -ForegroundColor Yellow
        Write-Host "  Ejecuta .\start-ngrok.ps1 para iniciar los tuneles" -ForegroundColor Gray
    }
}
catch {
    Write-Host "[ERROR] No se pudo conectar a la API de ngrok (puerto 4040)" -ForegroundColor Red
    Write-Host "  Asegurate de que ngrok este corriendo" -ForegroundColor Gray
    Write-Host "  Ejecuta .\start-ngrok.ps1 para iniciar los tuneles" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumen" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para acceder desde ngrok:" -ForegroundColor Yellow
if ($frontendUrl) {
    Write-Host "  1. Frontend: $frontendUrl" -ForegroundColor Gray
}
else {
    Write-Host "  1. Frontend: No se encontro tunel activo para el puerto 3000" -ForegroundColor Gray
}
if ($backendUrl) {
    Write-Host "  2. Backend: $backendUrl" -ForegroundColor Gray
}
else {
    Write-Host "  2. Backend: No se encontro tunel activo para el puerto 3001" -ForegroundColor Gray
}
Write-Host "  3. Reinicia el frontend despues de cambiar .env.local" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
