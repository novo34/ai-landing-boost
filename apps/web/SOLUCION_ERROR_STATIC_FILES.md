# Solución: Error de Archivos Estáticos de Next.js

## 🔍 Problema

Los archivos estáticos (CSS, JS) no se están sirviendo correctamente:
- Error 404 en archivos estáticos
- MIME type incorrecto ('text/html' en lugar de 'text/css' o 'application/javascript')
- Los archivos devuelven HTML en lugar del contenido esperado

## ✅ Solución Aplicada

1. **Cache eliminado:**
   - Eliminado `.next` (cache de compilación)
   - Verificado cache de `node_modules`

2. **Procesos Node detenidos:**
   - Todos los procesos Node fueron detenidos para evitar conflictos

## 🚀 Pasos para Resolver

### 1. Asegúrate de que no haya procesos corriendo

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### 2. Limpia el cache (ya hecho)

```powershell
cd apps/web
Remove-Item -Recurse -Force .next
```

### 3. Reinicia el servidor de desarrollo

```powershell
npm run dev
# o
pnpm dev
```

### 4. Verifica que el servidor esté corriendo correctamente

Deberías ver en la consola:
```
  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Ready in X ms
```

### 5. Recarga la página en el navegador

- Presiona `Ctrl + F5` (o `Cmd + Shift + R` en Mac) para forzar recarga
- O abre DevTools > Network > Disable cache y recarga

## 🔧 Si el Problema Persiste

### Opción 1: Reinstalar dependencias

```powershell
cd apps/web
Remove-Item -Recurse -Force node_modules
npm install
# o
pnpm install
```

### Opción 2: Verificar puerto

Asegúrate de que el puerto 3000 no esté ocupado:

```powershell
netstat -ano | findstr :3000
```

Si está ocupado, puedes cambiar el puerto:

```powershell
$env:PORT=3002
npm run dev
```

### Opción 3: Verificar configuración de Next.js

El archivo `next.config.mjs` parece estar correcto. Si hay problemas, puedes simplificarlo temporalmente.

## 📝 Notas

- Este error generalmente ocurre cuando:
  - El servidor de desarrollo no está corriendo
  - Hay un problema con la compilación
  - El cache está corrupto
  - Hay conflictos de puerto

- La solución más común es limpiar el cache y reiniciar el servidor.

