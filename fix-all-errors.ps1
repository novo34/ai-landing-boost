# Script para corregir todos los errores detectados
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Corrección de Errores - AutomAI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Corregir variables de entorno del backend
Write-Host "[1] Corrigiendo variables de entorno del backend..." -ForegroundColor Yellow
Set-Location "apps\api"
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    $needsUpdate = $false
    $newContent = $envContent
    
    if ($envContent -notmatch "JWT_SECRET=") {
        $newContent += "`nJWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars"
        $needsUpdate = $true
        Write-Host "  ✅ Agregando JWT_SECRET" -ForegroundColor Green
    }
    
    if ($envContent -notmatch "JWT_REFRESH_SECRET=") {
        $newContent += "`nJWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars"
        $needsUpdate = $true
        Write-Host "  ✅ Agregando JWT_REFRESH_SECRET" -ForegroundColor Green
    }
    
    if ($envContent -match "FRONTEND_URL=http://localhost:8080") {
        $newContent = $newContent -replace "FRONTEND_URL=http://localhost:8080", "FRONTEND_URL=http://localhost:3000"
        $needsUpdate = $true
        Write-Host "  ✅ Corrigiendo FRONTEND_URL a localhost:3000" -ForegroundColor Green
    }
    
    if ($needsUpdate) {
        $newContent | Set-Content .env -NoNewline
        Write-Host "  ✅ Archivo .env actualizado" -ForegroundColor Green
    }
    else {
        Write-Host "  ✅ Variables de entorno OK" -ForegroundColor Green
    }
}
else {
    Write-Host "  ❌ apps/api/.env no existe - creando..." -ForegroundColor Red
    @"
DATABASE_URL=mysql://root@localhost:3306/ai_agencia
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "  ✅ Archivo .env creado" -ForegroundColor Green
}
Set-Location "..\.."

# 2. Crear .env del frontend si no existe
Write-Host "`n[2] Verificando variables de entorno del frontend..." -ForegroundColor Yellow
Set-Location "apps\web"
if (-not (Test-Path .env)) {
    "NEXT_PUBLIC_API_URL=http://localhost:3001" | Out-File -FilePath .env -Encoding utf8
    Write-Host "  ✅ Archivo .env creado para frontend" -ForegroundColor Green
}
else {
    Write-Host "  ✅ Archivo .env existe" -ForegroundColor Green
}
Set-Location "..\.."

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ✅ Correcciones completadas" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nPróximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Verifica que DATABASE_URL en apps/api/.env sea correcta" -ForegroundColor White
Write-Host "  2. Genera secretos seguros para JWT_SECRET y JWT_REFRESH_SECRET" -ForegroundColor White
Write-Host "  3. Inicia el backend: cd apps/api && pnpm run start:dev" -ForegroundColor White
Write-Host "  4. Inicia el frontend: cd apps/web && pnpm run dev" -ForegroundColor White
Write-Host ""

