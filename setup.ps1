# Script de setup completo para AutomAI SaaS
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AutomAI SaaS - Setup Inicial" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Instalar dependencias
Write-Host "[1/4] Instalando dependencias..." -ForegroundColor Yellow
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# Paso 2: Configurar variables de entorno
Write-Host "[2/4] Configurando variables de entorno..." -ForegroundColor Yellow

# Backend
if (-not (Test-Path "apps/api/.env")) {
    if (Test-Path "apps/api/.env.example") {
        Copy-Item "apps/api/.env.example" "apps/api/.env"
        Write-Host "✅ Creado apps/api/.env desde .env.example" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANTE: Edita apps/api/.env y configura las variables" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ apps/api/.env.example no encontrado" -ForegroundColor Red
    }
}
else {
    Write-Host "ℹ️  apps/api/.env ya existe" -ForegroundColor Cyan
}

# Frontend
if (-not (Test-Path "apps/web/.env")) {
    if (Test-Path "apps/web/.env.example") {
        Copy-Item "apps/web/.env.example" "apps/web/.env"
        Write-Host "✅ Creado apps/web/.env desde .env.example" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANTE: Edita apps/web/.env y configura las variables" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ apps/web/.env.example no encontrado" -ForegroundColor Red
    }
}
else {
    Write-Host "ℹ️  apps/web/.env ya existe" -ForegroundColor Cyan
}
Write-Host ""

# Paso 3: Configurar Prisma
Write-Host "[3/4] Configurando Prisma..." -ForegroundColor Yellow
Set-Location "apps/api"
& ".\setup-prisma.ps1"
Set-Location "..\.."
Write-Host ""

# Paso 4: Verificación final
Write-Host "[4/4] Verificación final..." -ForegroundColor Yellow

# Verificar que Prisma Client está generado
if (Test-Path "apps/api/node_modules/.prisma/client") {
    Write-Host "✅ Prisma Client generado" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Prisma Client no encontrado. Ejecuta: pnpm prisma generate" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Setup completado!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Edita apps/api/.env y apps/web/.env" -ForegroundColor White
Write-Host "  2. Configura DATABASE_URL en apps/api/.env" -ForegroundColor White
Write-Host "  3. Inicia el backend: .\start-backend.ps1" -ForegroundColor White
Write-Host "  4. Inicia el frontend: .\start-frontend.ps1" -ForegroundColor White
Write-Host ""







