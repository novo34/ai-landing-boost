# Script para iniciar el backend
Set-Location "apps\api"
Write-Host "Iniciando backend en http://0.0.0.0:3001..." -ForegroundColor Green
Write-Host "Accesible desde otros dispositivos en la red local" -ForegroundColor Yellow
pnpm run start:dev

