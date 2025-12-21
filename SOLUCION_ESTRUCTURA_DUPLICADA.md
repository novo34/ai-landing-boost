# Solución: Eliminación de Estructura Duplicada

## 🔍 Análisis Realizado

### Directorios Duplicados Encontrados:

1. **`apps/api/apps/`** - ✅ **VACÍO** (0 archivos) - SEGURO ELIMINAR
2. **`apps/apps/`** - ⚠️ Contiene 1 archivo: `.env.example` - Verificar antes de eliminar

### Scripts Verificados:

- ✅ `start-backend.ps1` usa `apps\api` (correcto)
- ✅ `start-frontend.ps1` usa `apps\web` (correcto)
- ✅ No hay referencias a las rutas duplicadas en el código

## 🚀 Solución: Eliminar Directorios Duplicados

### Paso 1: Eliminar `apps/api/apps/` (VACÍO)

```powershell
Remove-Item -Recurse -Force "apps\api\apps"
```

### Paso 2: Verificar y Eliminar `apps/apps/`

**Opción A: Si el `.env.example` es igual al de la ubicación correcta:**

```powershell
# Verificar que existe en la ubicación correcta
if (Test-Path "apps\api\.env.example") {
    # Eliminar directorio duplicado
    Remove-Item -Recurse -Force "apps\apps"
    Write-Host "✅ Directorio duplicado eliminado"
} else {
    # Mover el archivo antes de eliminar
    Move-Item "apps\apps\api\.env.example" "apps\api\.env.example"
    Remove-Item -Recurse -Force "apps\apps"
    Write-Host "✅ Archivo movido y directorio eliminado"
}
```

**Opción B: Eliminar directamente (si estás seguro):**

```powershell
Remove-Item -Recurse -Force "apps\apps"
```

## ✅ Verificación Post-Eliminación

Después de eliminar, verificar que la estructura sea:

```
ai-landing-boost/
├── apps/
│   ├── api/          ✅
│   └── web/           ✅
```

## 📝 Comandos para Ejecutar

```powershell
# Desde la raíz del proyecto
cd "C:\Program Files\xammp\htdocs\ai-landing-boost"

# Eliminar apps/api/apps (vacío)
Remove-Item -Recurse -Force "apps\api\apps" -ErrorAction SilentlyContinue

# Verificar .env.example antes de eliminar apps/apps
if (Test-Path "apps\apps\api\.env.example") {
    if (-not (Test-Path "apps\api\.env.example")) {
        Move-Item "apps\apps\api\.env.example" "apps\api\.env.example"
        Write-Host "✅ .env.example movido a ubicación correcta"
    }
}

# Eliminar apps/apps
Remove-Item -Recurse -Force "apps\apps" -ErrorAction SilentlyContinue

Write-Host "✅ Estructura duplicada eliminada"
```

## ⚠️ Nota Importante

- Los directorios duplicados **NO contienen código activo**
- Los scripts usan las rutas correctas (`apps\api` y `apps\web`)
- Es seguro eliminar estos directorios

