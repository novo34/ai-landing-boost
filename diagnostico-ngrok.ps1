<# 
diagnostico-ngrok.ps1
- Diagnostica problemas con ngrok y la configuracion del sistema
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

function Write-Title([string]$text) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ("  " + $text) -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Status([string]$message, [string]$status) {
    $color = switch ($status) {
        "OK" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "INFO" { "Cyan" }
        default { "Gray" }
    }
    Write-Host "[$status] $message" -ForegroundColor $color
}

Write-Title "Diagnostico de ngrok y Sistema"

# 1. Verificar que ngrok este instalado
Write-Host "1. Verificando instalacion de ngrok..." -ForegroundColor Cyan
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrokInstalled) {
    $ngrokVersion = (ngrok version 2>&1 | Select-String "version").ToString()
    Write-Status "ngrok esta instalado: $ngrokVersion" "OK"
}
else {
    Write-Status "ngrok NO esta instalado" "ERROR"
    Write-Host "  Instala ngrok con: winget install ngrok.ngrok" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar authtoken
Write-Host ""
Write-Host "2. Verificando authtoken de ngrok..." -ForegroundColor Cyan
try {
    $configCheck = ngrok config check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Authtoken configurado correctamente" "OK"
    }
    else {
        Write-Status "Problema con la configuracion de ngrok" "WARNING"
        Write-Host "  Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor Yellow
    }
}
catch {
    Write-Status "No se pudo verificar el authtoken" "WARNING"
}

# 3. Verificar puertos locales
Write-Host ""
Write-Host "3. Verificando puertos locales..." -ForegroundColor Cyan

$backendPort = 3001
$frontendPort = 3000

$backendRunning = Test-NetConnection -ComputerName localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue
$frontendRunning = Test-NetConnection -ComputerName localhost -Port $frontendPort -InformationLevel Quiet -WarningAction SilentlyContinue

if ($backendRunning) {
    Write-Status "Backend corriendo en puerto $backendPort" "OK"
}
else {
    Write-Status "Backend NO esta corriendo en puerto $backendPort" "ERROR"
    Write-Host "  Inicia el backend con: .\start-backend.ps1" -ForegroundColor Yellow
}

if ($frontendRunning) {
    Write-Status "Frontend corriendo en puerto $frontendPort" "OK"
}
else {
    Write-Status "Frontend NO esta corriendo en puerto $frontendPort" "WARNING"
    Write-Host "  Inicia el frontend con: .\start-frontend.ps1" -ForegroundColor Yellow
}

# 4. Verificar tuneles de ngrok activos
Write-Host ""
Write-Host "4. Verificando tuneles de ngrok activos..." -ForegroundColor Cyan
try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction SilentlyContinue
    
    if ($tunnels -and $tunnels.tunnels) {
        Write-Status "Se encontraron $($tunnels.tunnels.Count) tunel(es) activo(s)" "OK"
        Write-Host ""
        
        $frontendUrl = $null
        $backendUrl = $null
        
        foreach ($tunnel in $tunnels.tunnels) {
            $name = $tunnel.name
            $url = $tunnel.public_url
            $addr = $tunnel.config.addr
            
            Write-Host "  Tunel: $name" -ForegroundColor Gray
            Write-Host "    URL publica: $url" -ForegroundColor White
            Write-Host "    Direccion local: $addr" -ForegroundColor Gray
            
            if ($name -eq "frontend") {
                $frontendUrl = $url
            }
            elseif ($name -eq "backend") {
                $backendUrl = $url
            }
            
            Write-Host ""
        }
        
        # Verificar si ambos tuneles tienen la misma URL (PROBLEMA)
        if ($frontendUrl -and $backendUrl -and $frontendUrl -eq $backendUrl) {
            Write-Status "PROBLEMA DETECTADO: Ambos tuneles tienen la misma URL" "ERROR"
            Write-Host "  Frontend: $frontendUrl" -ForegroundColor Red
            Write-Host "  Backend:  $backendUrl" -ForegroundColor Red
            Write-Host ""
            Write-Host "  SOLUCION:" -ForegroundColor Yellow
            Write-Host "  1. Deten ngrok (Ctrl+C en la ventana de ngrok)" -ForegroundColor Gray
            Write-Host "  2. Espera 1-2 minutos" -ForegroundColor Gray
            Write-Host "  3. Ejecuta: .\start-ngrok-separados.ps1" -ForegroundColor Gray
            Write-Host "  4. Copia la URL del BACKEND y configurala en apps/web/.env.local" -ForegroundColor Gray
        }
        else {
            if ($backendUrl) {
                Write-Status "URL del Backend: $backendUrl" "INFO"
                Write-Host "  Configura esta URL en apps/web/.env.local como:" -ForegroundColor Yellow
                Write-Host "  NEXT_PUBLIC_API_URL=$backendUrl" -ForegroundColor White
            }
        }
    }
    else {
        Write-Status "No hay tuneles de ngrok activos" "WARNING"
        Write-Host "  Inicia ngrok con: .\start-ngrok_2.ps1" -ForegroundColor Yellow
    }
}
catch {
    Write-Status "ngrok no esta corriendo o no esta accesible en http://127.0.0.1:4040" "WARNING"
    Write-Host "  Inicia ngrok con: .\start-ngrok_2.ps1" -ForegroundColor Yellow
}

# 5. Verificar configuracion del frontend
Write-Host ""
Write-Host "5. Verificando configuracion del frontend..." -ForegroundColor Cyan
$envFile = "apps\web\.env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "NEXT_PUBLIC_API_URL\s*=\s*(.+)") {
        $apiUrl = $matches[1].Trim()
        Write-Status "NEXT_PUBLIC_API_URL configurado: $apiUrl" "OK"
        
        # Verificar si es una URL de ngrok
        if ($apiUrl -match "ngrok") {
            Write-Status "La URL parece ser de ngrok" "OK"
        }
        else {
            Write-Status "La URL NO es de ngrok (puede ser localhost)" "INFO"
        }
    }
    else {
        Write-Status "NEXT_PUBLIC_API_URL NO esta configurado en .env.local" "WARNING"
        Write-Host "  Agrega: NEXT_PUBLIC_API_URL=https://TU_URL_NGROK_BACKEND" -ForegroundColor Yellow
    }
}
else {
    Write-Status "Archivo .env.local no encontrado" "WARNING"
    Write-Host "  Crea el archivo apps/web/.env.local con:" -ForegroundColor Yellow
    Write-Host "  NEXT_PUBLIC_API_URL=https://TU_URL_NGROK_BACKEND" -ForegroundColor White
}

# 6. Probar conexion al backend
Write-Host ""
Write-Host "6. Probando conexion al backend..." -ForegroundColor Cyan
if ($backendRunning) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -Body '{"email":"test","password":"test"}' -ContentType "application/json" -ErrorAction SilentlyContinue -TimeoutSec 3
        if ($response.StatusCode -eq 401 -or $response.StatusCode -eq 400) {
            Write-Status 'Backend responde correctamente - 401/400 esperado para credenciales invalidas' "OK"
        }
        else {
            Write-Status "Backend responde con codigo: $($response.StatusCode)" "INFO"
        }
    }
    catch {
        try {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 401 -or $statusCode -eq 400) {
                Write-Status 'Backend responde correctamente - 401/400 esperado' "OK"
            }
            elseif ($statusCode -eq 404) {
                Write-Status 'Backend responde pero la ruta /auth/login no existe - 404' "ERROR"
            }
            else {
                Write-Status "Error al conectar al backend" "WARNING"
            }
        }
        catch {
            Write-Status "Error al conectar al backend" "WARNING"
        }
    }
}
else {
    Write-Status "No se puede probar: backend no esta corriendo" "WARNING"
}

Write-Host ""
Write-Title "Diagnostico Completado"
