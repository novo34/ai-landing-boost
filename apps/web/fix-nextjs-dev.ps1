# Script para solucionar errores 404/500 en Next.js dev server
# Uso: .\fix-nextjs-dev.ps1

Write-Host "🔧 Solucionando errores de Next.js dev server..." -ForegroundColor Yellow
Write-Host ""

# 1. Detener procesos Node
Write-Host "1. Deteniendo procesos Node..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "   ✅ Procesos Node detenidos" -ForegroundColor Green

# 2. Limpiar cache de Next.js
Write-Host "2. Limpiando cache de Next.js..." -ForegroundColor Cyan
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "   ✅ Cache .next eliminado" -ForegroundColor Green
}
else {
    Write-Host "   ℹ️  Cache .next no existe" -ForegroundColor Gray
}

# 3. Verificar puerto 3000
Write-Host "3. Verificando puerto 3000..." -ForegroundColor Cyan
$portCheck = netstat -ano | findstr ":3000"
if ($portCheck) {
    Write-Host "   ⚠️  Puerto 3000 está en uso:" -ForegroundColor Yellow
    Write-Host "   $portCheck" -ForegroundColor Gray
    Write-Host "   💡 Si necesitas cambiar el puerto, usa: `$env:PORT=3002" -ForegroundColor Yellow
}
else {
    Write-Host "   ✅ Puerto 3000 disponible" -ForegroundColor Green
}

# 4. Crear favicon.ico si no existe
Write-Host "4. Verificando favicon.ico..." -ForegroundColor Cyan
if (-not (Test-Path "app\favicon.ico") -and -not (Test-Path "public\favicon.ico")) {
    Write-Host "   ⚠️  favicon.ico no encontrado (esto puede causar error 500)" -ForegroundColor Yellow
    Write-Host "   💡 Crea un favicon.ico en app/ o public/ para evitar el error" -ForegroundColor Yellow
}
else {
    Write-Host "   ✅ favicon.ico encontrado" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Limpieza completada" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Ahora ejecuta:" -ForegroundColor Cyan
Write-Host "   pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "💡 Si el problema persiste:" -ForegroundColor Yellow
Write-Host "   1. Verifica que no haya otros procesos usando el puerto 3000" -ForegroundColor Gray
Write-Host "   2. Reinstala dependencias: pnpm install" -ForegroundColor Gray
Write-Host "   3. Verifica que Next.js esté instalado: pnpm list next" -ForegroundColor Gray
Write-Host ""
