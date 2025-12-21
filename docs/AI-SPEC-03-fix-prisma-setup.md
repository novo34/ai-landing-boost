# AI-SPEC-03: Configuración y Validación de Prisma

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-03  
> **Prioridad:** 🔴 CRÍTICA

---

## Árbol de Archivos a Modificar

```
ai-landing-boost/
├── apps/
│   └── api/
│       ├── package.json                    [MODIFICAR]
│       ├── src/
│       │   └── prisma/
│       │       └── prisma.service.ts       [MODIFICAR]
│       └── setup-prisma.ps1                [CREAR]
└── setup.ps1                                [CREAR]
```

---

## Pasos Exactos de Ejecución

### Paso 1: Actualizar package.json del Backend

**Archivo:** `apps/api/package.json`

**Acción:** Agregar scripts de Prisma a la sección "scripts"

**Código a Agregar:**
```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:validate": "prisma validate",
    "prisma:reset": "prisma migrate reset",
    "postinstall": "prisma generate",
    "prebuild": "prisma generate"
  }
}
```

**Nota:** Agregar estos scripts a los scripts existentes, no reemplazar.

---

### Paso 2: Mejorar PrismaService con Validación

**Archivo:** `apps/api/src/prisma/prisma.service.ts`

**Acción:** Reemplazar contenido completo

**Código:**
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      // Conectar a la base de datos
      await this.$connect();
      this.logger.log('✅ Prisma Client connected to database');

      // Verificar que la conexión funciona
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection verified');

      // Verificar que Prisma Client está generado correctamente
      // Intentar acceder a un modelo para verificar tipos
      await this.user.findFirst({ take: 1 });
      this.logger.log('✅ Prisma Client types verified');
    } catch (error) {
      this.logger.error('❌ Prisma connection failed:', error);
      this.logger.error('\n💡 Troubleshooting steps:');
      this.logger.error('   1. Check DATABASE_URL in .env file');
      this.logger.error('   2. Run: pnpm prisma generate');
      this.logger.error('   3. Run: pnpm prisma migrate deploy');
      this.logger.error('   4. Verify MySQL is running and accessible\n');
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected');
  }
}
```

---

### Paso 3: Crear Script de Setup de Prisma

**Archivo:** `apps/api/setup-prisma.ps1`

**Acción:** Crear archivo nuevo

**Código:**
```powershell
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
```

---

### Paso 4: Crear Script de Setup General

**Archivo:** `setup.ps1` (raíz)

**Acción:** Crear archivo nuevo

**Código:**
```powershell
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
    } else {
        Write-Host "❌ apps/api/.env.example no encontrado" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  apps/api/.env ya existe" -ForegroundColor Cyan
}

# Frontend
if (-not (Test-Path "apps/web/.env")) {
    if (Test-Path "apps/web/.env.example") {
        Copy-Item "apps/web/.env.example" "apps/web/.env"
        Write-Host "✅ Creado apps/web/.env desde .env.example" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANTE: Edita apps/web/.env y configura las variables" -ForegroundColor Yellow
    } else {
        Write-Host "❌ apps/web/.env.example no encontrado" -ForegroundColor Red
    }
} else {
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
} else {
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
```

---

## Código Sugerido/Reemplazos

Ninguno adicional.

---

## Condiciones Previas

1. ✅ SPEC-01 completado (monorepo configurado)
2. ✅ SPEC-02 completado (variables de entorno configuradas)
3. ✅ MySQL instalado y corriendo
4. ✅ DATABASE_URL configurada en `.env`

---

## Tests Automatizables

### Test 1: Verificar Prisma Client Generado

```bash
# Verificar que Prisma Client existe
test -d apps/api/node_modules/.prisma/client && echo "✅ Prisma Client generado" || echo "❌ Prisma Client no generado"
```

### Test 2: Verificar Conexión a BD

```typescript
// tests/prisma/connection.spec.ts
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Prisma Connection', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  it('should connect to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });
});
```

### Test 3: Verificar Scripts en package.json

```bash
# Verificar que los scripts existen
node -e "const pkg = require('./apps/api/package.json'); const required = ['prisma:generate', 'prisma:migrate']; required.forEach(s => { if (!pkg.scripts[s]) throw new Error(\`Script \${s} no encontrado\`) })"
```

---

## Notas para Compliance

- ✅ **Seguridad:** Validación de conexión a BD antes de iniciar
- ✅ **GDPR:** No afecta directamente, pero asegura que la BD esté configurada correctamente
- ✅ **Tenants:** Prisma es crítico para el sistema multi-tenant
- ✅ **Cookies:** No afecta directamente

---

## Validación Post-Implementación

1. Ejecutar `pnpm prisma generate` - debe generar el cliente
2. Ejecutar `pnpm prisma validate` - debe validar el schema
3. Iniciar el backend - debe conectar a la BD correctamente
4. Verificar logs - deben mostrar conexión exitosa
5. Ejecutar `setup.ps1` - debe completar todos los pasos

---

## Orden de Ejecución

Este SPEC debe ejecutarse **TERCERO**, después de SPEC-02, ya que requiere variables de entorno configuradas.

