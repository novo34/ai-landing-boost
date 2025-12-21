# Cómo Ejecutar el Script de Migración

## Variables de Entorno Requeridas

El script necesita estas variables de entorno:

```bash
ENCRYPTION_KEY=...              # Clave legacy (para decrypt datos antiguos)
ENCRYPTION_KEY_V1=...           # Clave nueva (para encrypt datos migrados)
ENCRYPTION_ACTIVE_KEY_VERSION=1 # Versión activa (default: 1)
```

## Opción 1: PowerShell (Windows)

```powershell
cd "c:\Program Files\xammp\htdocs\ai-landing-boost\apps\api"

# Configurar variables de entorno
$env:ENCRYPTION_KEY="tu-clave-legacy-aqui"
$env:ENCRYPTION_KEY_V1="tu-clave-nueva-aqui"
$env:ENCRYPTION_ACTIVE_KEY_VERSION="1"
$env:CRYPTO_MIGRATION_DRY_RUN="true"

# Ejecutar en modo dry-run (recomendado primero)
npm run migrate-crypto-legacy

# Si todo está bien, ejecutar migración real (sin DRY_RUN)
$env:CRYPTO_MIGRATION_DRY_RUN="false"
npm run migrate-crypto-legacy
```

## Opción 2: Crear archivo .env.local

Crea un archivo `.env.local` en `apps/api/` con:

```env
ENCRYPTION_KEY=tu-clave-legacy-aqui
ENCRYPTION_KEY_V1=tu-clave-nueva-aqui
ENCRYPTION_ACTIVE_KEY_VERSION=1
CRYPTO_MIGRATION_DRY_RUN=true
```

Luego ejecuta:
```bash
npm run migrate-crypto-legacy
```

## Opción 3: Usar dotenv

Si el proyecto usa `dotenv`, puedes crear un archivo `.env.migration` y cargarlo:

```bash
# Instalar dotenv-cli si no está instalado
npm install -g dotenv-cli

# Crear .env.migration con las variables
# Luego ejecutar:
dotenv -e .env.migration -- npm run migrate-crypto-legacy
```

## ⚠️ IMPORTANTE

1. **Siempre ejecuta primero en modo DRY_RUN** para ver qué se migrará
2. **Haz backup de la base de datos** antes de ejecutar la migración real
3. **Verifica las claves** - deben ser las mismas que se usan en producción
4. **Revisa la salida** del script para confirmar que todo está correcto

## Formato de las Claves

- `ENCRYPTION_KEY`: Clave legacy (puede ser hex de 64 caracteres o base64)
- `ENCRYPTION_KEY_V1`: Clave nueva en **base64** (32 bytes = 44 caracteres base64)

Para generar una clave nueva en base64:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Verificación Post-Migración

Después de ejecutar, verifica con las queries SQL en `CRYPTO-MIGRATION-INSTRUCTIONS.md`
