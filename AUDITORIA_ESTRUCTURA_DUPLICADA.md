# Auditoría: Estructura de Directorios Duplicada

## 🔍 Problema Detectado

Se encontraron directorios duplicados en la estructura del proyecto:

1. **`apps/api/apps/api/`** - Estructura duplicada dentro de la API
2. **`apps/apps/api/`** - Estructura duplicada en el nivel superior
3. **`apps/apps/web/`** - Estructura duplicada en el nivel superior

## 📊 Estructura Actual (Incorrecta)

```
ai-landing-boost/
├── apps/
│   ├── api/                    ✅ CORRECTO
│   │   ├── src/
│   │   ├── prisma/
│   │   └── apps/               ❌ DUPLICADO
│   │       └── api/
│   │           └── src/
│   ├── apps/                   ❌ DUPLICADO
│   │   ├── api/
│   │   │   └── src/
│   │   └── web/
│   │       └── components/
│   └── web/                    ✅ CORRECTO
│       ├── app/
│       ├── components/
│       └── lib/
```

## ✅ Estructura Correcta Esperada

```
ai-landing-boost/
├── apps/
│   ├── api/                    ✅ Backend (NestJS)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   └── web/                    ✅ Frontend (Next.js)
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
```

## 🔧 Acciones Recomendadas

### 1. Verificar Contenido de Directorios Duplicados

Antes de eliminar, verificar si contienen código importante o si están vacíos.

### 2. Eliminar Directorios Duplicados

Si los directorios duplicados están vacíos o contienen código obsoleto:

```powershell
# Eliminar estructura duplicada dentro de api
Remove-Item -Recurse -Force "apps\api\apps"

# Eliminar estructura duplicada en nivel superior
Remove-Item -Recurse -Force "apps\apps"
```

### 3. Verificar Referencias

Buscar referencias a las rutas duplicadas en:
- Scripts de inicio (`start-backend.ps1`, `start-frontend.ps1`)
- Configuraciones de build
- Archivos de configuración

## ⚠️ Precauciones

- **NO eliminar** sin verificar primero el contenido
- Hacer backup antes de eliminar
- Verificar que no haya código único en los directorios duplicados
- Actualizar cualquier script que referencie las rutas duplicadas

## 📝 Notas

La estructura duplicada puede causar:
- Confusión en las rutas
- Problemas de compilación
- Errores al ejecutar scripts
- Conflictos en el monorepo

