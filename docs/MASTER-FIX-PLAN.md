# Master Fix Plan - SaaS AutomAI

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Estado:** 📋 Plan de Ejecución

---

## Resumen Ejecutivo

Este documento define el orden exacto de ejecución de todos los fixes identificados en la auditoría técnica. Los fixes están organizados por prioridad y dependencias, asegurando que cada paso se ejecute en el orden correcto.

**Total de Fixes:** 12 críticos + 8 mayores + 5 menores  
**Tiempo Estimado:** 4-6 horas de trabajo

---

## Orden de Ejecución

### FASE 1: Fundamentos del Monorepo (CRÍTICA)

#### ✅ SPEC-01: Corrección de Configuración del Monorepo
**Prioridad:** 🔴 CRÍTICA - DEBE SER PRIMERO  
**Tiempo Estimado:** 15 minutos  
**Dependencias:** Ninguna

**Archivos a Modificar:**
- `package.json` (raíz)
- `start-backend.ps1`
- `start-frontend.ps1`
- `pnpm-workspace.yaml` (verificar)

**Comandos a Ejecutar:**
```powershell
# 1. Verificar pnpm instalado
pnpm --version

# 2. Instalar dependencias
pnpm install

# 3. Verificar workspace
pnpm list --depth=0
```

**Validación:**
- [ ] `pnpm install` funciona desde la raíz
- [ ] `pnpm --filter @ai-landing-boost/api start:dev` inicia backend
- [ ] `pnpm --filter @ai-landing-boost/web dev` inicia frontend
- [ ] Scripts PowerShell funcionan

**Siguiente Paso:** SPEC-02

---

### FASE 2: Variables de Entorno (CRÍTICA)

#### ✅ SPEC-02: Documentación y Configuración de Variables de Entorno
**Prioridad:** 🔴 CRÍTICA  
**Tiempo Estimado:** 20 minutos  
**Dependencias:** SPEC-01

**Archivos a Crear/Modificar:**
- `apps/api/.env.example` (CREAR)
- `apps/web/.env.example` (CREAR)
- `apps/api/src/config/env.validation.ts` (CREAR)
- `apps/api/src/main.ts` (MODIFICAR)
- `README.md` (MODIFICAR)

**Comandos a Ejecutar:**
```powershell
# 1. Crear archivos .env desde ejemplos
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env

# 2. Configurar variables (EDITAR MANUALMENTE)
# Editar apps/api/.env y apps/web/.env

# 3. Generar secretos seguros
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 32  # Para JWT_REFRESH_SECRET
```

**Validación:**
- [ ] Archivos `.env.example` existen
- [ ] Archivos `.env` creados (no commitear)
- [ ] Variables configuradas correctamente
- [ ] Backend valida variables al iniciar
- [ ] Backend falla con mensaje claro si faltan variables

**Siguiente Paso:** SPEC-03

---

### FASE 3: Prisma y Base de Datos (CRÍTICA)

#### ✅ SPEC-03: Configuración y Validación de Prisma
**Prioridad:** 🔴 CRÍTICA  
**Tiempo Estimado:** 30 minutos  
**Dependencias:** SPEC-02

**Archivos a Modificar/Crear:**
- `apps/api/package.json` (MODIFICAR)
- `apps/api/src/prisma/prisma.service.ts` (MODIFICAR)
- `apps/api/setup-prisma.ps1` (CREAR)
- `setup.ps1` (CREAR)

**Comandos a Ejecutar:**
```powershell
# 1. Generar Prisma Client
Set-Location apps/api
pnpm prisma generate

# 2. Validar schema
pnpm prisma validate

# 3. Aplicar migraciones (si BD está lista)
pnpm prisma migrate deploy
# O para desarrollo:
pnpm prisma migrate dev

# 4. Verificar conexión
Set-Location ../..
```

**Validación:**
- [ ] Prisma Client generado correctamente
- [ ] Schema validado
- [ ] Migraciones aplicadas (si aplica)
- [ ] Backend conecta a BD al iniciar
- [ ] Logs muestran conexión exitosa

**Siguiente Paso:** SPEC-04

---

### FASE 4: Configuración de Next.js (CRÍTICA)

#### ✅ SPEC-04: Configuración Completa de Next.js
**Prioridad:** 🔴 CRÍTICA  
**Tiempo Estimado:** 25 minutos  
**Dependencias:** SPEC-02

**Archivos a Modificar:**
- `apps/web/next.config.ts` (MODIFICAR)
- `apps/web/lib/config/env.ts` (CREAR - opcional)

**Comandos a Ejecutar:**
```powershell
# 1. Verificar configuración
Set-Location apps/web
pnpm run build  # Debe funcionar sin errores

# 2. Iniciar en desarrollo
pnpm run dev
```

**Validación:**
- [ ] `next.config.ts` incluye todas las configuraciones
- [ ] Variables de entorno públicas disponibles
- [ ] Build funciona sin errores
- [ ] Headers de seguridad presentes
- [ ] Imágenes se cargan correctamente

**Siguiente Paso:** SPEC-05

---

### FASE 5: Sistema i18n (CRÍTICA)

#### ✅ SPEC-05: Corrección de Sistema i18n
**Prioridad:** 🔴 CRÍTICA  
**Tiempo Estimado:** 45 minutos  
**Dependencias:** SPEC-04

**Archivos a Modificar:**
- `apps/web/lib/i18n/index.ts` (MODIFICAR)
- `apps/web/lib/i18n/client.ts` (MODIFICAR)
- `apps/web/lib/i18n/translations.ts` (CREAR - si se usa solución estática)
- O migrar a `next-intl` (recomendado)

**Decisión Requerida:**
- Opción A: Usar imports estáticos (más rápido, menos mantenible)
- Opción B: Migrar a `next-intl` (mejor solución a largo plazo)

**Comandos a Ejecutar:**
```powershell
# Si Opción B (next-intl):
Set-Location apps/web
pnpm add next-intl

# Luego seguir documentación de next-intl
```

**Validación:**
- [ ] Build de Next.js funciona sin errores
- [ ] Traducciones se cargan correctamente
- [ ] Funciona en Server Components
- [ ] Funciona en Client Components
- [ ] No hay errores en runtime

**Siguiente Paso:** SPEC-06

---

### FASE 6: Guards y CORS (CRÍTICA)

#### ✅ SPEC-06: Corrección de Guards y Configuración CORS
**Prioridad:** 🔴 CRÍTICA  
**Tiempo Estimado:** 30 minutos  
**Dependencias:** SPEC-02

**Archivos a Modificar:**
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` (MODIFICAR)
- `apps/api/src/main.ts` (MODIFICAR)
- `apps/api/src/common/validators/public-routes.validator.ts` (CREAR - opcional)

**Comandos a Ejecutar:**
```powershell
# 1. Iniciar backend
Set-Location apps/api
pnpm run start:dev

# 2. Probar rutas públicas desde frontend
# Abrir http://localhost:3000/login
# Debe funcionar sin autenticación
```

**Validación:**
- [ ] Rutas públicas funcionan sin autenticación
- [ ] Rutas protegidas requieren autenticación
- [ ] CORS permite requests del frontend
- [ ] Logging de requests bloqueados funciona
- [ ] Desarrollo local funciona sin problemas

**Siguiente Paso:** Validación Completa

---

## Validación Final del Sistema

### Checklist de Validación

#### Backend
- [ ] Backend inicia sin errores
- [ ] Conecta a base de datos correctamente
- [ ] Prisma Client funciona
- [ ] Variables de entorno validadas
- [ ] Rutas públicas accesibles sin autenticación
- [ ] Rutas protegidas requieren autenticación
- [ ] CORS funciona correctamente
- [ ] Cookies HttpOnly se envían correctamente

#### Frontend
- [ ] Frontend inicia sin errores
- [ ] Build de producción funciona
- [ ] Variables de entorno públicas disponibles
- [ ] i18n funciona correctamente
- [ ] Cliente API funciona
- [ ] Login/Registro funcionan
- [ ] Cookies se reciben correctamente

#### Integración
- [ ] Frontend puede comunicarse con backend
- [ ] Autenticación funciona end-to-end
- [ ] Cookies HttpOnly funcionan
- [ ] CORS no bloquea requests legítimos
- [ ] Multi-tenant funciona (si aplica)

---

## Fixes Adicionales (Mayores y Menores)

### FASE 7: Mejoras Mayores (Después de Validación)

Estos fixes pueden ejecutarse después de que el sistema funcione:

1. **Mejora de Cliente API** (SPEC-07)
   - Manejo de errores mejorado
   - Retry logic
   - Timeout configuration

2. **Mejora de TenantContextGuard** (SPEC-08)
   - Soporte para rutas públicas con tenant
   - Mejor logging

3. **Configuración de TypeScript** (SPEC-09)
   - Paths mejorados
   - Validación de tipos

4. **Scripts de Automatización** (SPEC-10)
   - CI/CD básico
   - Tests automatizados

---

## Comandos de Verificación Rápida

### Verificar Todo el Sistema

```powershell
# 1. Verificar monorepo
pnpm list --depth=0

# 2. Verificar Prisma
Set-Location apps/api
pnpm prisma validate
pnpm prisma generate
Set-Location ../..

# 3. Verificar variables de entorno
# (Revisar manualmente apps/api/.env y apps/web/.env)

# 4. Build completo
pnpm run build

# 5. Iniciar sistema
.\start-backend.ps1  # En terminal 1
.\start-frontend.ps1  # En terminal 2
```

---

## Troubleshooting

### Problema: Backend no inicia

**Checklist:**
1. ¿Variables de entorno configuradas? → Ver SPEC-02
2. ¿Prisma Client generado? → Ver SPEC-03
3. ¿Base de datos accesible? → Verificar DATABASE_URL
4. ¿Puerto 3001 disponible? → Cambiar PORT en .env

### Problema: Frontend no inicia

**Checklist:**
1. ¿Variables de entorno configuradas? → Ver SPEC-02
2. ¿next.config.ts correcto? → Ver SPEC-04
3. ¿i18n configurado? → Ver SPEC-05
4. ¿Puerto 3000 disponible? → Cambiar puerto

### Problema: CORS bloquea requests

**Checklist:**
1. ¿FRONTEND_URL configurada? → Ver SPEC-02
2. ¿CORS configurado correctamente? → Ver SPEC-06
3. ¿Backend y frontend en puertos correctos? → Verificar

### Problema: i18n no funciona

**Checklist:**
1. ¿Imports estáticos o next-intl? → Ver SPEC-05
2. ¿Archivos de traducción existen? → Verificar estructura
3. ¿Build funciona? → Verificar errores de build

---

## Orden de Ejecución Resumido

```
1. SPEC-01: Monorepo Config          [15 min]  🔴 CRÍTICO
2. SPEC-02: Variables de Entorno    [20 min]  🔴 CRÍTICO
3. SPEC-03: Prisma Setup            [30 min]  🔴 CRÍTICO
4. SPEC-04: Next.js Config           [25 min]  🔴 CRÍTICO
5. SPEC-05: i18n Fix                 [45 min]  🔴 CRÍTICO
6. SPEC-06: Guards y CORS            [30 min]  🔴 CRÍTICO
7. Validación Completa               [30 min]
────────────────────────────────────────────────
TOTAL: ~3.5 horas (solo fixes críticos)
```

---

## Notas Importantes

1. **NO saltar pasos:** Cada SPEC depende del anterior
2. **Validar después de cada paso:** No continuar si hay errores
3. **Backup antes de cambios:** Hacer commit o backup antes de empezar
4. **Documentar problemas:** Si algo falla, documentarlo
5. **Tests después de cada fase:** Verificar que todo funciona

---

## Referencias

- `docs/AUDITORIA-TECNICA-COMPLETA.md` - Auditoría completa
- `docs/PRD-*.md` - Product Requirements Documents
- `docs/AI-SPEC-*.md` - Especificaciones técnicas detalladas
- `IA-Specs/*.mdc` - Especificaciones de arquitectura

---

## Estado de Ejecución

**Para el desarrollador:** Marca cada SPEC como completado cuando lo termines.

- [ ] SPEC-01: Monorepo Config
- [ ] SPEC-02: Variables de Entorno
- [ ] SPEC-03: Prisma Setup
- [ ] SPEC-04: Next.js Config
- [ ] SPEC-05: i18n Fix
- [ ] SPEC-06: Guards y CORS
- [ ] Validación Completa

---

**Última Actualización:** 2025-01-XX  
**Próxima Revisión:** Después de completar todos los SPECs

