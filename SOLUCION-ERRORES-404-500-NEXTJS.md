# Solución: Errores 404/500 en Next.js Dev Server

> **Fecha:** 2025-01-XX  
> **Problema:** Errores 404 en archivos estáticos y 500 en favicon.ico  
> **Prioridad:** 🔴 CRÍTICA

---

## 🔍 Síntomas

```
GET http://localhost:3000/_next/static/chunks/main-app.js?v=1765737733229 net::ERR_ABORTED 404 (Not Found)
GET http://localhost:3000/_next/static/chunks/app-pages-internals.js net::ERR_ABORTED 404 (Not Found)
favicon.ico:1  GET http://localhost:3000/favicon.ico 500 (Internal Server Error)
```

---

## 🔍 Root Causes

1. **Servidor de desarrollo no está corriendo correctamente**
   - El servidor puede haber crasheado
   - Puede haber un error en la compilación que impide servir archivos estáticos

2. **Cache corrupto de Next.js**
   - El directorio `.next` puede tener archivos corruptos
   - La compilación puede estar en un estado inconsistente

3. **Favicon.ico faltante**
   - Next.js intenta servir `/favicon.ico` pero no existe
   - Esto causa el error 500

4. **Puerto ocupado o conflicto**
   - Otro proceso puede estar usando el puerto 3000
   - El servidor puede estar intentando usar un puerto diferente

---

## ✅ Solución Paso a Paso

### Paso 1: Detener todos los procesos Node

```powershell
# Detener procesos Node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Paso 2: Limpiar cache de Next.js

```powershell
cd apps/web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

### Paso 3: Verificar puerto 3000

```powershell
# Verificar si el puerto está ocupado
netstat -ano | findstr ":3000"
```

Si está ocupado, puedes:
- Detener el proceso que lo usa
- O cambiar el puerto: `$env:PORT=3002`

### Paso 4: Crear favicon.ico (opcional pero recomendado)

Next.js busca el favicon en `app/favicon.ico` o `public/favicon.ico`.

**Opción A: Crear favicon simple**
```powershell
# Crear un favicon.ico vacío (temporal)
# O mejor: copiar uno existente o generar uno
```

**Opción B: Configurar en metadata (recomendado)**
Ya está configurado en `app/layout.tsx`, pero Next.js aún busca el archivo físico.

### Paso 5: Reiniciar el servidor

```powershell
cd apps/web
pnpm dev
```

O desde la raíz:
```powershell
pnpm --filter @ai-landing-boost/web dev
```

### Paso 6: Verificar que el servidor esté corriendo

Deberías ver en la consola:
```
  ▲ Next.js 14.2.33
  - Local:        http://localhost:3000
  - Ready in X ms
```

### Paso 7: Recargar el navegador

- Presiona `Ctrl + F5` (hard refresh)
- O abre DevTools > Network > ✅ Disable cache y recarga

---

## 🚀 Script Automatizado

He creado un script `apps/web/fix-nextjs-dev.ps1` que automatiza estos pasos:

```powershell
cd apps/web
.\fix-nextjs-dev.ps1
```

Luego ejecuta:
```powershell
pnpm dev
```

---

## 🔧 Si el Problema Persiste

### Opción 1: Reinstalar dependencias

```powershell
cd apps/web
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
pnpm install
```

### Opción 2: Verificar versión de Next.js

```powershell
cd apps/web
pnpm list next
```

Debería ser `next@14.2.33` según `package.json`.

### Opción 3: Verificar configuración

Revisa `next.config.mjs` - debería estar correcto según la auditoría previa.

### Opción 4: Verificar logs del servidor

Si el servidor está corriendo, revisa los logs en la consola para ver errores de compilación.

---

## 📝 Notas Técnicas

### Sobre los errores 404

Los archivos `main-app.js` y `app-pages-internals.js` son generados por Next.js durante la compilación. Si no existen, significa que:
- La compilación no se completó
- El servidor de desarrollo no está corriendo
- Hay un error en el código que impide la compilación

### Sobre el error 500 en favicon.ico

Next.js busca automáticamente `favicon.ico` en:
1. `app/favicon.ico` (App Router)
2. `public/favicon.ico` (Pages Router)

Si no existe, Next.js intenta generarlo pero puede fallar, causando un 500.

**Solución temporal:** Crear un favicon.ico vacío o usar un favicon real.

---

## ✅ Checklist de Verificación

- [ ] Procesos Node detenidos
- [ ] Cache `.next` eliminado
- [ ] Puerto 3000 disponible
- [ ] Servidor de desarrollo corriendo (`pnpm dev`)
- [ ] No hay errores en la consola del servidor
- [ ] Navegador recargado con hard refresh (Ctrl+F5)
- [ ] Favicon.ico existe (opcional pero recomendado)

---

## 🔄 Prevención

1. **Siempre detén el servidor correctamente** (Ctrl+C)
2. **Limpia el cache si hay problemas** (`Remove-Item -Recurse -Force .next`)
3. **Verifica que el puerto esté libre** antes de iniciar
4. **Mantén Next.js actualizado** (`pnpm update next`)

---

**Autor:** Senior Full-Stack Engineer  
**Estado:** ✅ Solución documentada
