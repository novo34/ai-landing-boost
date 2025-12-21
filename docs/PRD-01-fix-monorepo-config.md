# PRD-01: Corrección de Configuración del Monorepo

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente

---

## Problema Detectado

El `package.json` en la raíz del proyecto está configurado para un proyecto Vite/React standalone, no para un monorepo con pnpm workspace. Esto causa problemas de resolución de dependencias y scripts no funcionan correctamente.

## Impacto en el SaaS

- **Alto:** El sistema no puede iniciarse correctamente
- Los scripts del monorepo no funcionan
- Dependencias pueden duplicarse o resolverse incorrectamente
- Desarrolladores no pueden trabajar en el proyecto

## Causa Raíz

El proyecto fue migrado de una estructura Vite standalone a un monorepo con pnpm, pero el `package.json` raíz no se actualizó para reflejar esta nueva estructura.

## Requisitos Funcionales

### RF-01: package.json Raíz Correcto
- El `package.json` raíz debe configurarse como workspace manager de pnpm
- Debe incluir scripts para gestionar el monorepo
- Debe referenciar correctamente las apps en `apps/*`

### RF-02: Scripts de Inicio Actualizados
- Los scripts `start-backend.ps1` y `start-frontend.ps1` deben usar `pnpm` en lugar de `npm`
- Deben ejecutarse desde el directorio correcto

### RF-03: Workspace Configurado
- `pnpm-workspace.yaml` debe estar correctamente configurado
- Las apps deben estar correctamente referenciadas

## Requisitos Técnicos

### RT-01: Estructura de package.json
```json
{
  "name": "@ai-landing-boost/root",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "pnpm --filter @ai-landing-boost/web dev & pnpm --filter @ai-landing-boost/api start:dev",
    "build": "pnpm --filter @ai-landing-boost/api build && pnpm --filter @ai-landing-boost/web build",
    "install:all": "pnpm install",
    "clean": "pnpm -r exec rm -rf node_modules dist .next"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

### RT-02: Scripts PowerShell Actualizados
```powershell
# start-backend.ps1
Set-Location "apps\api"
Write-Host "Iniciando backend en http://localhost:3001..." -ForegroundColor Green
pnpm run start:dev

# start-frontend.ps1
Set-Location "apps\web"
Write-Host "Iniciando frontend en http://localhost:3000..." -ForegroundColor Green
pnpm run dev
```

### RT-03: Verificación de Workspace
- `pnpm-workspace.yaml` debe existir y estar correcto
- Las apps deben tener nombres correctos en sus package.json

## Criterios de Aceptación QA

- [ ] `pnpm install` funciona correctamente desde la raíz
- [ ] `pnpm --filter @ai-landing-boost/api start:dev` inicia el backend
- [ ] `pnpm --filter @ai-landing-boost/web dev` inicia el frontend
- [ ] Los scripts PowerShell funcionan correctamente
- [ ] No hay dependencias duplicadas
- [ ] El workspace reconoce todas las apps

## Consideraciones de Seguridad

- No hay implicaciones de seguridad directas
- Asegurar que los scripts no ejecuten código malicioso

## Dependencias

- Ninguna (es el primer fix a realizar)

## Referencias

- IA-Specs/01-saas-architecture-and-stack.mdc
- pnpm workspace documentation

