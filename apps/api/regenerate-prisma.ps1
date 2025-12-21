# Script para regenerar Prisma Client
Write-Host "Regenerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "Prisma Client regenerado exitosamente!" -ForegroundColor Green

