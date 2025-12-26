# SPEC-SEC-0001: Unificación de Gestor de Paquetes (PNPM) - Especificación Técnica

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**PRD Relacionado:** PRD-SEC-0001  
**Prioridad:** P0 (Chore)

---

## 1. Diseño Técnico

### 1.1 Arquitectura
Este cambio es **puramente de limpieza y configuración**, no requiere cambios arquitectónicos.

### 1.2 Componentes Afectados

#### 1.2.1 Archivos a Eliminar
```
/
├── package-lock.json          [ELIMINAR]
├── bun.lockb                  [ELIMINAR]
└── apps/
    └── api/
        └── package-lock.json [ELIMINAR]
```

#### 1.2.2 Archivos a Modificar
```
/
├── .gitignore                 [ACTUALIZAR: agregar exclusiones]
├── README.md                  [ACTUALIZAR: instrucciones pnpm]
└── .github/workflows/         [ACTUALIZAR: agregar check de lockfiles]
    └── ci.yml (o similar)     [NUEVO o ACTUALIZAR]
```

### 1.3 Flujo de Implementación

```
1. Verificar estado actual
   ├── Listar lockfiles existentes
   └── Verificar pnpm-lock.yaml está actualizado

2. Regenerar pnpm-lock.yaml
   ├── Ejecutar: pnpm install
   └── Verificar: no hay errores

3. Eliminar lockfiles redundantes
   ├── Eliminar package-lock.json (raíz)
   ├── Eliminar bun.lockb (raíz)
   └── Eliminar apps/api/package-lock.json

4. Actualizar .gitignore
   └── Agregar exclusiones si no existen

5. Implementar CI check
   └── Script que valide solo pnpm-lock.yaml

6. Actualizar documentación
   └── README.md con instrucciones pnpm

7. Validar
   ├── pnpm install funciona
   ├── CI check funciona
   └── PR con package-lock.json es rechazado
```

---

## 2. Detalles de Configuración

### 2.1 Variables de Entorno
**No aplica:** Este cambio no requiere variables de entorno.

### 2.2 Configuración de CI/CD

#### 2.2.1 GitHub Actions (Ejemplo)
**NOTA:** Si el repositorio no tiene directorio `.github/workflows/`, crearlo primero:
```bash
mkdir -p .github/workflows
```

Luego crear el archivo `.github/workflows/validate-lockfiles.yml`:

```yaml
name: Validate Lockfiles

on:
  pull_request:
    paths:
      - 'package-lock.json'
      - 'bun.lockb'
      - 'apps/**/package-lock.json'
      - 'pnpm-lock.yaml'

jobs:
  validate-lockfiles:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check for forbidden lockfiles
        run: |
          if [ -f "package-lock.json" ] || [ -f "bun.lockb" ] || [ -f "apps/api/package-lock.json" ]; then
            echo "❌ ERROR: Se detectaron lockfiles no permitidos"
            echo "Por favor, elimina estos archivos y usa 'pnpm install'"
            exit 1
          fi
          
      - name: Verify pnpm-lock.yaml exists
        run: |
          if [ ! -f "pnpm-lock.yaml" ]; then
            echo "❌ ERROR: pnpm-lock.yaml no encontrado"
            echo "Por favor, ejecuta 'pnpm install' y commitea el lockfile"
            exit 1
          fi
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
```

#### 2.2.2 Pre-commit Hook (Opcional)
```bash
#!/bin/sh
# .husky/pre-commit (si usas husky)

# Detectar lockfiles no permitidos
if [ -f "package-lock.json" ] || [ -f "bun.lockb" ] || [ -f "apps/api/package-lock.json" ]; then
  echo "⚠️  ADVERTENCIA: Se detectaron lockfiles no permitidos"
  echo "Por favor, elimina estos archivos y usa 'pnpm install'"
  echo "Archivos detectados:"
  [ -f "package-lock.json" ] && echo "  - package-lock.json"
  [ -f "bun.lockb" ] && echo "  - bun.lockb"
  [ -f "apps/api/package-lock.json" ] && echo "  - apps/api/package-lock.json"
  exit 1
fi
```

---

## 3. Cambios a Esquema

### 3.1 Base de Datos
**No aplica:** Este cambio no afecta el esquema de base de datos.

### 3.2 Archivos de Configuración

#### 3.2.1 .gitignore
**Agregar (si no existen):**
```
# Lockfiles de otros gestores (no permitidos)
package-lock.json
bun.lockb
**/package-lock.json

# pnpm-lock.yaml DEBE estar versionado (NO agregar aquí)
```

**NOTA:** El `.gitignore` actual NO tiene estas exclusiones. Deben agregarse durante la implementación.

#### 3.2.2 README.md
**Agregar sección (si no existe):**
```markdown
## Gestión de Dependencias

Este proyecto usa **pnpm** como gestor de paquetes único.

### Instalación
```bash
pnpm install
```

### Comandos Comunes
```bash
# Instalar dependencias
pnpm install

# Agregar dependencia
pnpm add <package>

# Agregar dependencia de desarrollo
pnpm add -D <package>

# Remover dependencia
pnpm remove <package>

# Actualizar dependencias
pnpm update
```

### ⚠️ Importante
- **NO uses** `npm install` o `bun install`
- Solo `pnpm-lock.yaml` debe estar versionado
- Si accidentalmente generas `package-lock.json`, elimínalo antes de commitear
```

---

## 4. Estrategia de Compatibilidad

### 4.1 Migración
**No requiere migración de datos:** Solo limpieza de archivos.

### 4.2 Compatibilidad Hacia Atrás
- **Desarrolladores existentes:** Deben ejecutar `pnpm install` después de pull
- **CI/CD:** Debe actualizarse para usar `pnpm` explícitamente

### 4.3 Fallback
**No aplica:** No hay fallback necesario.

---

## 5. Estrategia de Seguridad

### 5.1 Amenazas Identificadas
- **T1:** Dependencias desincronizadas entre lockfiles pueden introducir vulnerabilidades
- **T2:** Uso accidental de gestor incorrecto puede instalar versiones diferentes

### 5.2 Controles de Seguridad
- **C1:** CI check previene reintroducción de lockfiles no permitidos
- **C2:** `.gitignore` previene commits accidentales
- **C3:** `pnpm audit` debe ejecutarse en CI para detectar vulnerabilidades

### 5.3 Defaults Seguros
- **pnpm-lock.yaml** debe estar siempre actualizado y versionado
- **CI debe usar `--frozen-lockfile`** para garantizar versiones exactas

---

## 6. Plan de Pruebas

### 6.1 Pruebas Unitarias
**No aplica:** Este cambio no incluye código.

### 6.2 Pruebas de Integración

#### IT-001: Instalación Limpia
**Descripción:** Verificar que el proyecto se puede instalar desde cero

**Pasos:**
1. Eliminar `node_modules` y lockfiles
2. Ejecutar `pnpm install`
3. Verificar que no hay errores
4. Verificar que `pnpm-lock.yaml` se genera correctamente

**Resultado esperado:** Instalación exitosa sin errores

#### IT-002: CI Check Rechaza Lockfiles No Permitidos
**Descripción:** Verificar que CI rechaza PRs con lockfiles incorrectos

**Pasos:**
1. Crear branch de prueba
2. Agregar `package-lock.json` al repo
3. Crear PR
4. Verificar que CI check falla

**Resultado esperado:** CI check falla con mensaje claro

#### IT-003: CI Check Acepta Solo pnpm-lock.yaml
**Descripción:** Verificar que CI acepta PRs con solo pnpm-lock.yaml

**Pasos:**
1. Crear branch de prueba
2. Modificar `package.json` (agregar dependencia)
3. Ejecutar `pnpm install`
4. Commitear solo `pnpm-lock.yaml`
5. Crear PR
6. Verificar que CI check pasa

**Resultado esperado:** CI check pasa exitosamente

### 6.3 Pruebas End-to-End

#### E2E-001: Flujo Completo de Desarrollo
**Descripción:** Verificar que un desarrollador puede trabajar normalmente

**Pasos:**
1. Clonar repo
2. Ejecutar `pnpm install`
3. Agregar nueva dependencia: `pnpm add axios`
4. Verificar que `pnpm-lock.yaml` se actualiza
5. Commitear cambios
6. Verificar que CI pasa

**Resultado esperado:** Flujo completo funciona sin problemas

---

## 7. Checklist de Verificación

### 7.1 Pre-Implementación
- [ ] Verificar que `pnpm-lock.yaml` existe y está actualizado
- [ ] Listar todos los lockfiles existentes: `find . -name "package-lock.json" -o -name "bun.lockb"`
- [ ] Verificar versión de pnpm: `pnpm --version` (debe ser >= 8.0.0)
- [ ] Backup de lockfiles actuales (opcional, para rollback)

### 7.2 Implementación
- [ ] Eliminar `package-lock.json` de la raíz
- [ ] Eliminar `bun.lockb` de la raíz
- [ ] Eliminar `apps/api/package-lock.json`
- [ ] Actualizar `.gitignore` con exclusiones
- [ ] Regenerar `pnpm-lock.yaml`: `pnpm install`
- [ ] Verificar que `pnpm install` funciona sin errores

### 7.3 CI/CD
- [ ] Crear o actualizar workflow de CI con check de lockfiles
- [ ] Probar CI check localmente (si es posible)
- [ ] Verificar que CI check falla con `package-lock.json`
- [ ] Verificar que CI check pasa con solo `pnpm-lock.yaml`

### 7.4 Documentación
- [ ] Actualizar `README.md` con instrucciones de pnpm
- [ ] Verificar que no hay referencias a `npm install` en docs principales
- [ ] Agregar sección de "Gestión de Dependencias" si no existe

### 7.5 Validación Final
- [ ] Ejecutar `pnpm install` en entorno limpio
- [ ] Verificar que todas las dependencias se instalan correctamente
- [ ] Ejecutar `pnpm audit` y verificar sin vulnerabilidades críticas
- [ ] Crear PR de prueba con `package-lock.json` y verificar rechazo
- [ ] Crear PR de prueba con solo `pnpm-lock.yaml` y verificar aceptación

### 7.6 Comandos de Verificación

```bash
# Verificar lockfiles existentes
find . -name "package-lock.json" -o -name "bun.lockb" | grep -v node_modules

# Verificar que pnpm-lock.yaml existe
test -f pnpm-lock.yaml && echo "✓ pnpm-lock.yaml existe" || echo "✗ pnpm-lock.yaml NO existe"

# Verificar instalación
pnpm install --frozen-lockfile

# Verificar auditoría
pnpm audit

# Verificar que .gitignore tiene exclusiones
grep -E "package-lock.json|bun.lockb" .gitignore
```

---

## 8. Plan de Rollback

### 8.1 Escenario: Problemas con pnpm-lock.yaml
**Síntomas:** `pnpm install` falla o instala versiones incorrectas

**Acción:**
1. Revertir commit que eliminó lockfiles
2. Restaurar `package-lock.json` y `bun.lockb` desde backup (si existe)
3. Investigar causa del problema
4. Corregir y reintentar

### 8.2 Escenario: CI Check Roto
**Síntomas:** CI check falla incorrectamente o no detecta problemas

**Acción:**
1. Revisar lógica del check
2. Corregir script de validación
3. Probar localmente antes de merge

### 8.3 Escenario: Dependencias Desincronizadas
**Síntomas:** Dependencias diferentes entre `package.json` y `pnpm-lock.yaml`

**Acción:**
1. Ejecutar `pnpm install` para regenerar lockfile
2. Verificar que todas las dependencias están en `package.json`
3. Commitear `pnpm-lock.yaml` actualizado

---

## 9. Referencias Técnicas

### 9.1 Documentación
- [pnpm Workspace](https://pnpm.io/workspaces)
- [pnpm CLI](https://pnpm.io/cli/add)
- [GitHub Actions](https://docs.github.com/en/actions)

### 9.2 Archivos Relacionados
- `package.json` (raíz) - Especifica pnpm como gestor
- `pnpm-workspace.yaml` - Configuración de workspace
- `.gitignore` - Exclusiones de archivos
- `.github/workflows/*.yml` - Configuración de CI

---

## 10. Notas de Implementación

### 10.1 Orden de Ejecución
1. **Primero:** Regenerar `pnpm-lock.yaml` para asegurar que está actualizado
2. **Segundo:** Eliminar lockfiles redundantes
3. **Tercero:** Actualizar `.gitignore` y documentación
4. **Cuarto:** Implementar CI check
5. **Quinto:** Validar todo el flujo

### 10.2 Puntos Críticos
- ⚠️ **NO eliminar lockfiles antes de regenerar pnpm-lock.yaml**
- ⚠️ **Verificar que pnpm-lock.yaml está actualizado antes de eliminar otros**
- ⚠️ **Asegurar que CI check funciona antes de mergear**

### 10.3 Comunicación al Equipo
- Notificar al equipo sobre el cambio
- Proporcionar instrucciones claras de uso de pnpm
- Responder preguntas sobre migración local

---

**Fin de la SPEC**

