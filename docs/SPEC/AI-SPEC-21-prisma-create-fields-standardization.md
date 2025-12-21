# AI-SPEC-21: Estandarización de Campos Obligatorios en Operaciones Prisma Create

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Estado:** [DRAFT]  
> **Referencia:** `PRD-21-prisma-create-fields-standardization.md`, `IA-Specs/06-backend-standards.mdc`

---

## Resumen Técnico

Esta especificación técnica detalla la implementación de una solución sistemática para garantizar que todas las operaciones `create` de Prisma incluyan los campos obligatorios `id` (String) y `updatedAt` (DateTime).

**Stack Tecnológico:**
- TypeScript 5.9+
- Prisma Client
- NestJS
- Jest/Vitest para testing

---

## Análisis del Problema

### Estado Actual

**Schema de Prisma:**
```prisma
model user {
  id        String   @id
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime  // ❌ Sin default
  // ...
}
```

**Código Problemático:**
```typescript
// ❌ Falta id y updatedAt
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    name: 'Test User',
  },
});
```

**Código Correcto (pero inconsistente):**
```typescript
// ✅ Incluye id y updatedAt
const user = await prisma.user.create({
  data: {
    id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    updatedAt: new Date(),
  },
});
```

### Impacto

- **Errores en tiempo de ejecución:** Prisma lanza error si `id` o `updatedAt` faltan
- **Inconsistencia:** Algunos servicios incluyen estos campos, otros no
- **Mantenibilidad:** Difícil recordar incluir estos campos en cada `create`

---

## Solución Técnica

### Arquitectura de la Solución

```
┌─────────────────────────────────────────┐
│  Helper/Utility Layer                   │
│  (createData, ensureCreateFields)       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Service Layer                          │
│  (Usa helper en todas las operaciones)  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Prisma Client                          │
│  (Operaciones create)                 │
└─────────────────────────────────────────┘
```

### Componente 1: Helper Centralizado

**Ubicación:** `apps/api/src/common/prisma/create-data.helper.ts`

**Implementación:**

```typescript
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

/**
 * Helper para garantizar que los campos obligatorios (id, updatedAt)
 * siempre se incluyan en operaciones create de Prisma.
 * 
 * @param data - Datos para la operación create
 * @returns Datos con id y updatedAt garantizados
 */
export function createData<T extends Record<string, any>>(
  data: T,
): T & { id: string; updatedAt: Date } {
  return {
    id: data.id || randomUUID(),
    ...data,
    updatedAt: data.updatedAt || new Date(),
  };
}

/**
 * Helper específico para transacciones de Prisma.
 * Útil cuando se usa dentro de $transaction.
 * 
 * @param data - Datos para la operación create
 * @returns Datos con id y updatedAt garantizados
 */
export function createDataInTransaction<T extends Record<string, any>>(
  data: T,
): T & { id: string; updatedAt: Date } {
  return createData(data);
}

/**
 * Type helper para inferir el tipo de datos de create.
 * Útil para mantener type-safety.
 */
export type CreateDataInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  updatedAt?: Date;
};
```

**Uso:**

```typescript
import { createData } from '@/common/prisma/create-data.helper';

// Uso básico
const user = await prisma.user.create({
  data: createData({
    email: 'test@example.com',
    name: 'Test User',
  }),
});

// Con tenantId (común en multitenancy)
const client = await prisma.client.create({
  data: createData({
    tenantId,
    name: 'Test Client',
    email: 'client@example.com',
  }),
});

// En transacciones
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: createDataInTransaction({
      email: 'test@example.com',
      name: 'Test User',
    }),
  });
  
  const tenant = await tx.tenant.create({
    data: createDataInTransaction({
      name: 'Test Tenant',
      slug: 'test-tenant',
    }),
  });
  
  return { user, tenant };
});
```

### Componente 2: Corrección de Código Existente

**Estrategia de Corrección:**

1. **Auditoría Automática:**
   - Buscar todas las operaciones `.create(` en el código
   - Identificar las que no incluyen `id` o `updatedAt`
   - Generar reporte de archivos a corregir

2. **Corrección Manual (Recomendada):**
   - Revisar cada archivo identificado
   - Aplicar corrección usando helper o incluyendo campos manualmente
   - Verificar que no se rompa funcionalidad

3. **Verificación:**
   - Ejecutar tests existentes
   - Ejecutar build-all
   - Verificar que no hay regresiones

**Script de Auditoría:**

```typescript
// scripts/audit-prisma-creates.ts
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface CreateOperation {
  file: string;
  line: number;
  model: string;
  hasId: boolean;
  hasUpdatedAt: boolean;
}

async function auditPrismaCreates(): Promise<CreateOperation[]> {
  const files = await glob('apps/api/src/**/*.ts', {
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  const issues: CreateOperation[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Buscar operaciones .create(
    const createRegex = /\.(user|tenant|appointment|message|conversation|agent|client|notification|tenantmembership|teaminvitation)\.create\(/g;
    let match;

    while ((match = createRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const model = match[1];
      
      // Buscar el bloque data: { ... }
      const dataStart = content.indexOf('data:', match.index);
      if (dataStart === -1) continue;

      const dataEnd = findMatchingBrace(content, dataStart + 5);
      const dataBlock = content.substring(dataStart, dataEnd);

      const hasId = /id\s*:/.test(dataBlock);
      const hasUpdatedAt = /updatedAt\s*:/.test(dataBlock);

      if (!hasId || !hasUpdatedAt) {
        issues.push({
          file,
          line: lineNumber,
          model,
          hasId,
          hasUpdatedAt,
        });
      }
    }
  }

  return issues;
}

function findMatchingBrace(content: string, startIndex: number): number {
  let depth = 0;
  let i = startIndex;

  while (i < content.length) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }

  return content.length;
}

// Ejecutar auditoría
auditPrismaCreates().then((issues) => {
  console.log(`Found ${issues.length} issues:`);
  issues.forEach((issue) => {
    console.log(`${issue.file}:${issue.line} - ${issue.model} (id: ${issue.hasId}, updatedAt: ${issue.hasUpdatedAt})`);
  });
});
```

### Componente 3: Tests Automatizados

**Tests Unitarios para Helper:**

```typescript
// tests/common/prisma/create-data.helper.spec.ts
import { createData, createDataInTransaction } from '@/common/prisma/create-data.helper';

describe('createData', () => {
  it('should add id if not provided', () => {
    const data = { email: 'test@example.com' };
    const result = createData(data);
    
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('should use provided id if exists', () => {
    const customId = 'custom-id-123';
    const data = { id: customId, email: 'test@example.com' };
    const result = createData(data);
    
    expect(result.id).toBe(customId);
  });

  it('should add updatedAt if not provided', () => {
    const data = { email: 'test@example.com' };
    const result = createData(data);
    
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should use provided updatedAt if exists', () => {
    const customDate = new Date('2025-01-01');
    const data = { email: 'test@example.com', updatedAt: customDate };
    const result = createData(data);
    
    expect(result.updatedAt).toBe(customDate);
  });

  it('should preserve all other fields', () => {
    const data = {
      email: 'test@example.com',
      name: 'Test User',
      tenantId: 'tenant-123',
    };
    const result = createData(data);
    
    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
    expect(result.tenantId).toBe('tenant-123');
  });
});
```

**Tests de Integración:**

```typescript
// tests/integration/prisma-create-fields.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { createData } from '@/common/prisma/create-data.helper';

describe('Prisma Create Fields Integration', () => {
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create user with helper', async () => {
    const user = await prisma.user.create({
      data: createData({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    expect(user.id).toBeDefined();
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.email).toBe('test@example.com');

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should fail without helper (validation test)', async () => {
    // Este test valida que Prisma requiere estos campos
    // Si el schema cambia y permite defaults, este test debe actualizarse
    await expect(
      prisma.user.create({
        data: {
          email: 'test2@example.com',
          // Sin id y updatedAt
        },
      }),
    ).rejects.toThrow();
  });
});
```

### Componente 4: Linting Rules (Opcional)

**ESLint Rule Personalizada:**

```typescript
// eslint-rules/prisma-create-fields.ts
import { ESLintUtils } from '@typescript-eslint/utils';

export const requirePrismaCreateFields = ESLintUtils.createRule({
  name: 'require-prisma-create-fields',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require id and updatedAt in Prisma create operations',
    },
    messages: {
      missingFields: 'Prisma create operations must include id and updatedAt. Use createData() helper.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        // Detectar .create( calls
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'create'
        ) {
          // Verificar que se use createData helper o que incluya campos
          // Implementación simplificada - puede mejorarse
          const sourceCode = context.getSourceCode();
          const text = sourceCode.getText(node);
          
          if (!text.includes('createData') && !text.includes('id:') && !text.includes('updatedAt:')) {
            context.report({
              node,
              messageId: 'missingFields',
            });
          }
        }
      },
    };
  },
});
```

---

## Plan de Implementación Detallado

### Paso 1: Crear Helper (2 horas)

1. Crear archivo `apps/api/src/common/prisma/create-data.helper.ts`
2. Implementar funciones `createData` y `createDataInTransaction`
3. Agregar tipos TypeScript
4. Escribir tests unitarios
5. Verificar que tests pasan

### Paso 2: Auditoría de Código Existente (2 horas)

1. Ejecutar script de auditoría
2. Generar reporte de archivos a corregir
3. Priorizar archivos por criticidad (servicios principales primero)

### Paso 3: Corrección de Código (4-6 horas)

1. Corregir archivos identificados uno por uno
2. Usar helper donde sea posible
3. Incluir campos manualmente donde helper no aplique
4. Verificar que no se rompa funcionalidad

**Archivos Prioritarios:**
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/appointments/appointments.service.ts`
- `apps/api/src/modules/conversations/conversations.service.ts`
- `apps/api/src/modules/whatsapp/**/*.service.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`

### Paso 4: Tests de Integración (2 horas)

1. Crear tests de integración
2. Ejecutar build-all
3. Corregir cualquier fallo

### Paso 5: Documentación (1 hora)

1. Actualizar `IA-Specs/06-backend-standards.mdc`
2. Agregar sección sobre uso de `createData` helper
3. Crear ejemplos de uso

---

## Estructura de Archivos

```
apps/api/
├── src/
│   ├── common/
│   │   └── prisma/
│   │       ├── create-data.helper.ts      # Helper principal
│   │       └── index.ts                  # Exports
│   └── modules/
│       └── ... (corregidos)
├── tests/
│   ├── common/
│   │   └── prisma/
│   │       └── create-data.helper.spec.ts
│   └── integration/
│       └── prisma-create-fields.spec.ts
└── scripts/
    └── audit-prisma-creates.ts
```

---

## Consideraciones Técnicas

### Type Safety

El helper debe mantener type-safety de TypeScript. Usar generics y tipos de Prisma:

```typescript
import { Prisma } from '@prisma/client';

type UserCreateInput = Prisma.UserCreateInput;

function createData<T extends UserCreateInput>(
  data: Omit<T, 'id' | 'updatedAt'> & { id?: string; updatedAt?: Date }
): T & { id: string; updatedAt: Date } {
  // ...
}
```

### Performance

El helper agrega overhead mínimo:
- `randomUUID()`: ~0.001ms
- `new Date()`: ~0.0001ms
- **Total:** < 0.01ms por operación (insignificante)

### Compatibilidad

- ✅ Compatible con Prisma Client actual
- ✅ Compatible con transacciones (`$transaction`)
- ✅ Compatible con nested creates (usar helper en cada nivel)

---

## Testing Strategy

### Cobertura Mínima Requerida

- **Helper:** 100% (funciones críticas)
- **Integración:** 80% (casos principales)
- **Servicios corregidos:** 60% (validar que funciona)

### Tests Obligatorios

1. ✅ Helper genera `id` si no se proporciona
2. ✅ Helper usa `id` proporcionado si existe
3. ✅ Helper genera `updatedAt` si no se proporciona
4. ✅ Helper usa `updatedAt` proporcionado si existe
5. ✅ Helper preserva todos los demás campos
6. ✅ Helper funciona en transacciones
7. ✅ Prisma rechaza creates sin campos (validación)

---

## Quality Gates

### Pre-merge Checklist

- [ ] Helper implementado y documentado
- [ ] Tests unitarios pasan (100% cobertura)
- [ ] Tests de integración pasan
- [ ] Código existente corregido (auditoría completa)
- [ ] Build-all pasa (exit code 0)
- [ ] TypeScript sin errores
- [ ] Lint sin errores
- [ ] Documentación actualizada

### Post-merge Validación

- [ ] Verificar que no hay regresiones en producción
- [ ] Monitorear logs por errores de creación
- [ ] Recopilar feedback del equipo

---

## Migración y Rollback

### Plan de Migración

1. **Fase 1:** Implementar helper (no breaking)
2. **Fase 2:** Corregir código existente gradualmente
3. **Fase 3:** Adoptar helper en nuevo código

### Plan de Rollback

Si hay problemas:
1. Revertir commits de corrección
2. Helper puede quedarse (no afecta código que no lo usa)
3. Restaurar código anterior si es necesario

---

## Referencias

- `PRD-21-prisma-create-fields-standardization.md` - PRD relacionado
- `IA-Specs/06-backend-standards.mdc` - Estándares backend
- `IA-Specs/07-testing-y-quality-gates.mdc` - Testing standards
- [Prisma Documentation](https://www.prisma.io/docs) - Referencia oficial
- `apps/api/fix-create-errors.ps1` - Script de corrección existente

---

## Aprobaciones Técnicas

- [ ] Backend Tech Lead
- [ ] Senior Developer
- [ ] QA Lead

---

## Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2025-01-XX | AI Assistant | Versión inicial |


