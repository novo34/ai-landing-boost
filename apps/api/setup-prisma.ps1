# Script para configurar Prisma
Write-Host "Setting up Prisma..." -ForegroundColor Green

# Verificar que .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "💡 Please copy .env.example to .env and configure DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Generar Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
pnpm prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prisma Client generated" -ForegroundColor Green

# Validar schema
Write-Host "Validating Prisma schema..." -ForegroundColor Yellow
pnpm prisma validate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma schema validation failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prisma schema is valid" -ForegroundColor Green

# Preguntar si aplicar migraciones
$apply = Read-Host "Apply database migrations? (y/n)"
if ($apply -eq "y" -or $apply -eq "Y") {
    Write-Host "Applying migrations..." -ForegroundColor Yellow
    pnpm prisma migrate deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to apply migrations" -ForegroundColor Red
        Write-Host "💡 You may need to run: pnpm prisma migrate dev" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Migrations applied" -ForegroundColor Green
} else {
    Write-Host "⚠️ Migrations not applied. Run 'pnpm prisma migrate deploy' when ready" -ForegroundColor Yellow
}

Write-Host "✅ Prisma setup complete!" -ForegroundColor Green







