# AI-SPEC-01: Corrección de Configuración del Monorepo

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-01  
> **Prioridad:** 🔴 CRÍTICA

---

## Árbol de Archivos a Modificar

```
ai-landing-boost/
├── package.json                    [MODIFICAR]
├── start-backend.ps1               [MODIFICAR]
├── start-frontend.ps1               [MODIFICAR]
└── pnpm-workspace.yaml              [VERIFICAR]
```

---

## Pasos Exactos de Ejecución

### Paso 1: Actualizar package.json Raíz

**Archivo:** `package.json` (raíz)

**Acción:** Reemplazar contenido completo

**Código:**
```json
{
  "name": "@ai-landing-boost/root",
  "private": true,
  "version": "0.1.0",
  "description": "AutomAI SaaS - Monorepo Root",
  "scripts": {
    "dev": "pnpm --filter @ai-landing-boost/web dev & pnpm --filter @ai-landing-boost/api start:dev",
    "dev:api": "pnpm --filter @ai-landing-boost/api start:dev",
    "dev:web": "pnpm --filter @ai-landing-boost/web dev",
    "build": "pnpm --filter @ai-landing-boost/api build && pnpm --filter @ai-landing-boost/web build",
    "build:api": "pnpm --filter @ai-landing-boost/api build",
    "build:web": "pnpm --filter @ai-landing-boost/web build",
    "install:all": "pnpm install",
    "clean": "pnpm -r exec rm -rf node_modules dist .next",
    "lint": "pnpm -r exec npm run lint",
    "format": "pnpm -r exec npm run format"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

---

### Paso 2: Actualizar start-backend.ps1

**Archivo:** `start-backend.ps1`

**Acción:** Reemplazar contenido completo

**Código:**
```powershell
# Script para iniciar el backend
Set-Location "apps\api"
Write-Host "Iniciando backend en http://localhost:3001..." -ForegroundColor Green
pnpm run start:dev
```

---

### Paso 3: Actualizar start-frontend.ps1

**Archivo:** `start-frontend.ps1`

**Acción:** Reemplazar contenido completo

**Código:**
```powershell
# Script para iniciar el frontend
Set-Location "apps\web"
Write-Host "Iniciando frontend en http://localhost:3000..." -ForegroundColor Green
pnpm run dev
```

---

### Paso 4: Verificar pnpm-workspace.yaml

**Archivo:** `pnpm-workspace.yaml`

**Acción:** Verificar que existe y tiene el contenido correcto

**Contenido Esperado:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Si no existe, crearlo.**

---

### Paso 5: Verificar Nombres en package.json de Apps

**Archivos:**
- `apps/api/package.json` - Debe tener `"name": "@ai-landing-boost/api"`
- `apps/web/package.json` - Debe tener `"name": "@ai-landing-boost/web"`

**Acción:** Verificar y corregir si es necesario

---

## Código Sugerido/Reemplazos

### Verificación de Workspace (Opcional)

Crear script de verificación:

**Archivo:** `scripts/verify-workspace.ps1`

```powershell
Write-Host "Verificando configuración del workspace..." -ForegroundColor Yellow

# Verificar pnpm-workspace.yaml
if (-not (Test-Path "pnpm-workspace.yaml")) {
    Write-Host "❌ pnpm-workspace.yaml no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar apps
$apps = @("apps/api", "apps/web")
foreach ($app in $apps) {
    if (-not (Test-Path $app)) {
        Write-Host "❌ $app no encontrado" -ForegroundColor Red
        exit 1
    }
    
    $packageJson = Join-Path $app "package.json"
    if (-not (Test-Path $packageJson)) {
        Write-Host "❌ $packageJson no encontrado" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Workspace configurado correctamente" -ForegroundColor Green
```

---

## Condiciones Previas

1. ✅ pnpm instalado (versión >= 8.0.0)
2. ✅ Node.js instalado (versión >= 20.0.0)
3. ✅ Estructura de carpetas `apps/api` y `apps/web` existe

---

## Tests Automatizables

### Test 1: Verificar package.json Raíz

```bash
# Verificar que el nombre es correcto
node -e "const pkg = require('./package.json'); if (pkg.name !== '@ai-landing-boost/root') throw new Error('Nombre incorrecto')"
```

### Test 2: Verificar Scripts

```bash
# Verificar que los scripts existen
node -e "const pkg = require('./package.json'); const required = ['dev', 'build', 'install:all']; required.forEach(s => { if (!pkg.scripts[s]) throw new Error(\`Script \${s} no encontrado\`) })"
```

### Test 3: Verificar Workspace

```bash
# Verificar pnpm-workspace.yaml
test -f pnpm-workspace.yaml && echo "✅ Workspace config existe" || echo "❌ Workspace config no existe"
```

### Test 4: Verificar Instalación

```bash
# Instalar y verificar
pnpm install
pnpm list --depth=0 | grep "@ai-landing-boost"
```

---

## Notas para Compliance

- ✅ No afecta cookies, CORS, tenants o GDPR
- ✅ Solo cambios de configuración del monorepo
- ✅ No modifica código de aplicación

---

## Validación Post-Implementación

1. Ejecutar `pnpm install` desde la raíz
2. Verificar que las dependencias se instalan correctamente
3. Ejecutar `pnpm --filter @ai-landing-boost/api start:dev` (debe iniciar backend)
4. Ejecutar `pnpm --filter @ai-landing-boost/web dev` (debe iniciar frontend)
5. Verificar que los scripts PowerShell funcionan

---

## Orden de Ejecución

Este SPEC debe ejecutarse **PRIMERO** antes que cualquier otro, ya que es la base del monorepo.

