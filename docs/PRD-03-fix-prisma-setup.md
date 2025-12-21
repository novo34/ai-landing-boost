# PRD-03: Configuración y Validación de Prisma

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente

---

## Problema Detectado

Prisma Client no está generado y no hay validación de que las migraciones estén aplicadas. El backend no puede iniciar sin Prisma Client y puede fallar silenciosamente si el schema de la BD no coincide.

## Impacto en el SaaS

- **Crítico:** Backend no puede iniciar sin Prisma Client generado
- Errores en runtime si el schema no coincide
- Difícil detectar problemas de migración
- Puede causar corrupción de datos
- Tipos TypeScript no disponibles

## Causa Raíz

Falta de automatización en el setup de Prisma. No hay scripts que generen el cliente ni validen el estado de las migraciones.

## Requisitos Funcionales

### RF-01: Generación Automática de Prisma Client
- Script en package.json para generar Prisma Client
- Generación automática después de `pnpm install`
- Verificación de que el cliente está generado antes de iniciar

### RF-02: Validación de Migraciones
- Verificar que las migraciones estén aplicadas antes de iniciar el servidor
- Mensaje de error claro si el schema no coincide
- Script para aplicar migraciones pendientes

### RF-03: Scripts de Setup
- Script para setup inicial completo
- Script para regenerar Prisma Client
- Script para aplicar migraciones

## Requisitos Técnicos

### RT-01: Scripts en apps/api/package.json
```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:validate": "prisma validate",
    "postinstall": "prisma generate",
    "prebuild": "prisma generate"
  }
}
```

### RT-02: Validación en PrismaService
```typescript
// apps/api/src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Verificar que Prisma Client está disponible
    try {
      await this.$connect();
      
      // Verificar que el schema coincide
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('❌ Prisma connection failed:', error);
      console.error('💡 Make sure to:');
      console.error('   1. Run: pnpm prisma generate');
      console.error('   2. Run: pnpm prisma migrate deploy');
      console.error('   3. Check DATABASE_URL in .env');
      throw error;
    }
  }
}
```

### RT-03: Script de Setup
```powershell
# setup.ps1 (en raíz)
Write-Host "Setting up AutomAI SaaS..." -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
Set-Location "apps\api"
pnpm prisma generate
Set-Location "..\.."

# Apply migrations (optional, with confirmation)
$apply = Read-Host "Apply database migrations? (y/n)"
if ($apply -eq "y") {
    Write-Host "Applying migrations..." -ForegroundColor Yellow
    Set-Location "apps\api"
    pnpm prisma migrate deploy
    Set-Location "..\.."
}

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "Don't forget to:" -ForegroundColor Yellow
Write-Host "  1. Copy .env.example to .env in apps/api and apps/web" -ForegroundColor Yellow
Write-Host "  2. Configure your environment variables" -ForegroundColor Yellow
```

## Criterios de Aceptación QA

- [ ] `pnpm prisma generate` genera el cliente correctamente
- [ ] Backend valida Prisma Client al iniciar
- [ ] Backend falla con mensaje claro si Prisma Client no está generado
- [ ] Backend valida conexión a BD al iniciar
- [ ] Script de setup funciona correctamente
- [ ] Migraciones se aplican correctamente
- [ ] Tipos TypeScript de Prisma están disponibles

## Consideraciones de Seguridad

- No ejecutar migraciones automáticamente sin confirmación
- Validar que DATABASE_URL es seguro antes de conectar
- No exponer credenciales en logs de error

## Dependencias

- PRD-02 (variables de entorno) - DATABASE_URL debe estar configurada

## Referencias

- IA-Specs/01-saas-architecture-and-stack.mdc
- IA-Specs/06-backend-standards.mdc
- Prisma documentation

