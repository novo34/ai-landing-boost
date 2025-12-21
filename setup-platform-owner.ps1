# Script PowerShell para asignar rol PLATFORM_OWNER
# Uso: .\setup-platform-owner.ps1 <email>

param(
    [Parameter(Mandatory = $true)]
    [string]$Email
)

Write-Host "🔍 Configurando usuario como PLATFORM_OWNER..." -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo .env
$envFile = "apps\api\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ No se encontró el archivo .env en apps/api" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Leer DATABASE_URL del .env
$databaseUrl = ""
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^DATABASE_URL=(.+)$') {
        $databaseUrl = $matches[1]
    }
}

if (-not $databaseUrl) {
    Write-Host "❌ No se encontró DATABASE_URL en .env" -ForegroundColor Red
    exit 1
}

# Extraer información de conexión (simplificado)
Write-Host "📝 Ejecuta este comando SQL en tu base de datos MySQL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "UPDATE user SET platformRole = 'PLATFORM_OWNER' WHERE email = '$Email';" -ForegroundColor Green
Write-Host ""
Write-Host "O usa el script de Node.js:" -ForegroundColor Yellow
Write-Host "  cd apps/api" -ForegroundColor Cyan
Write-Host "  npx ts-node scripts/setup-platform-owner.ts $Email" -ForegroundColor Cyan
Write-Host ""
