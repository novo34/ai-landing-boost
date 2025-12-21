# 🔧 Solución: Error 500 en test-page

## ❌ Error Encontrado

```
GET http://127.0.0.1:3000/test-page 500 (Internal Server Error)
GET http://127.0.0.1:3000/_next/static/chunks/... 404 (Not Found)
```

## 🔍 Causa Probable

El error 500 probablemente viene del **layout raíz** que usa `detectLocale()` async. Esta función puede fallar si hay problemas con:
- Headers de Next.js
- Cookies
- Imports dinámicos

## ✅ Soluciones Aplicadas

### 1. **Página de prueba alternativa creada**
- **Ruta:** `/test-simple`
- **Archivo:** `apps/web/app/test-simple/page.tsx`
- Esta página NO depende del layout raíz

### 2. **detectLocale() mejorado**
- Ahora maneja errores mejor
- No lanza excepciones que causen 500
- Siempre retorna un valor válido (fallback)

### 3. **Cache limpiado**
- Eliminado `.next` completamente

## 🚀 Pasos para Resolver

### 1. **Reinicia Next.js completamente:**

```powershell
# Detén el servidor (Ctrl+C)
# Luego inicia de nuevo:
cd apps\web
npm run dev
# o
pnpm dev
```

### 2. **Prueba la página simple:**

Abre: `http://127.0.0.1:3000/test-simple`

Esta página debería funcionar porque no depende del layout raíz.

### 3. **Si test-simple funciona pero test-page no:**

El problema es el layout raíz con `detectLocale()`. Revisa los logs del servidor Next.js para ver el error específico.

### 4. **Verificar logs del servidor:**

En la terminal donde corre Next.js, busca errores como:
- `Error detecting locale`
- `Cannot read property of undefined`
- Cualquier error relacionado con `cookies()` o `headers()`

## 🔍 Diagnóstico Adicional

Si ambas páginas fallan con 500, el problema puede ser:

1. **Next.js no está compilando correctamente**
   - Verifica que no haya errores de TypeScript
   - Verifica que todas las dependencias estén instaladas

2. **Problema con el middleware**
   - Aunque está deshabilitado, puede haber problemas de compilación
   - Intenta renombrarlo: `Rename-Item middleware.ts middleware.ts.disabled`

3. **Problema con node_modules**
   - Intenta: `npm install` o `pnpm install`

## 📝 Nota

El layout raíz (`app/layout.tsx`) siempre se aplica a todas las páginas en Next.js App Router. Si `detectLocale()` falla, todas las páginas fallarán con 500.

La función `detectLocale()` ahora está más robusta y no debería causar 500, pero si persiste el problema, necesitamos ver los logs específicos del servidor.


