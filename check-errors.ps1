# Script para verificar y reportar errores del sistema
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Errores - AutomAI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar variables de entorno del backend
Write-Host "[1] Verificando variables de entorno del backend..." -ForegroundColor Yellow
Set-Location "apps\api"
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    $errors = @()
    
    if ($envContent -notmatch "JWT_SECRET=") {
        $errors += "❌ JWT_SECRET faltante"
    }
    if ($envContent -notmatch "JWT_REFRESH_SECRET=") {
        $errors += "❌ JWT_REFRESH_SECRET faltante"
    }
    if ($envContent -notmatch "DATABASE_URL=") {
        $errors += "❌ DATABASE_URL faltante"
    }
    
    if ($errors.Count -eq 0) {
        Write-Host "✅ Variables de entorno del backend OK" -ForegroundColor Green
    }
    else {
        Write-Host "Errores encontrados:" -ForegroundColor Red
        $errors | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
}
else {
    Write-Host "❌ apps/api/.env no existe" -ForegroundColor Red
}
Set-Location "..\.."

# 2. Verificar variables de entorno del frontend
Write-Host "`n[2] Verificando variables de entorno del frontend..." -ForegroundColor Yellow
Set-Location "apps\web"
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    if ($envContent -match "NEXT_PUBLIC_API_URL=") {
        Write-Host "✅ Variables de entorno del frontend OK" -ForegroundColor Green
    }
    else {
        Write-Host "❌ NEXT_PUBLIC_API_URL faltante" -ForegroundColor Red
    }
}
else {
    Write-Host "❌ apps/web/.env no existe" -ForegroundColor Red
}
Set-Location "..\.."

# 3. Verificar archivos i18n
Write-Host "`n[3] Verificando archivos i18n..." -ForegroundColor Yellow
if (Test-Path "apps\web\lib\i18n\client.tsx") {
    Write-Host "✅ client.tsx existe" -ForegroundColor Green
}
else {
    Write-Host "❌ client.tsx no existe" -ForegroundColor Red
}

if (Test-Path "apps\web\lib\i18n\translations.ts") {
    Write-Host "✅ translations.ts existe" -ForegroundColor Green
}
else {
    Write-Host "❌ translations.ts no existe" -ForegroundColor Red
}

# 4. Intentar compilar backend
Write-Host "`n[4] Verificando compilación del backend..." -ForegroundColor Yellow
Set-Location "apps\api"
try {
    $buildOutput = pnpm run build 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend compila correctamente" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Errores de compilación en backend:" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error al compilar backend: $_" -ForegroundColor Red
}
Set-Location "..\.."

# 5. Intentar compilar frontend
Write-Host "`n[5] Verificando compilación del frontend..." -ForegroundColor Yellow
Set-Location "apps\web"
try {
    $buildOutput = pnpm run build 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend compila correctamente" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Errores de compilación en frontend:" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error al compilar frontend: $_" -ForegroundColor Red
}
Set-Location "..\.."

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verificación completada" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

