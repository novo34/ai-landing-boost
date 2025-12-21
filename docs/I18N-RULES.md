# Reglas i18n - Sistema de Traducciones

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **Objetivo:** Guía para mantener y extender el sistema de internacionalización

---

## 1. Estructura del Sistema

### 1.1 Ubicación

- **Carpeta base:** `apps/web/lib/i18n/`
- **Server Components:** `apps/web/lib/i18n/index.ts`
- **Client Components:** `apps/web/lib/i18n/client.tsx`
- **Traducciones:** `apps/web/lib/i18n/locales/{locale}/{namespace}.json`

### 1.2 Namespaces

- `common` - Traducciones compartidas (botones, errores, navegación, etc.)
- `landing` - Traducciones de la landing page

### 1.3 Idiomas Soportados

- `es` (Español) - default
- `en` (Inglés)
- `de` (Alemán)
- `fr` (Francés)
- `it` (Italiano)
- `pt` (Portugués)
- `nl` (Holandés)
- `pl` (Polaco)

---

## 2. Cómo Añadir Nuevas Claves

### 2.1 Proceso

1. **Identificar el namespace correcto:**
   - `common` - Para traducciones compartidas
   - `landing` - Para traducciones de la landing page

2. **Agregar la clave en todos los idiomas:**
   - Empezar siempre por `es/common.json` o `es/landing.json`
   - Agregar la misma clave en `en/common.json` o `en/landing.json`
   - Agregar en los demás idiomas si es necesario (de, fr, it, pt, nl, pl)

3. **Estructura de claves:**
   - Usar notación de punto para anidación: `section.subsection.key`
   - Mantener consistencia con claves existentes
   - Usar nombres descriptivos en inglés para las claves

4. **Ejemplo:**
   ```json
   // es/common.json
   {
     "mi_seccion": {
       "mi_clave": "Mi texto en español"
     }
   }
   
   // en/common.json
   {
     "mi_seccion": {
       "mi_clave": "My text in English"
     }
   }
   ```

### 2.2 Uso en Código

**Server Components:**
```typescript
import { getTranslations } from '@/lib/i18n';

export default async function MyPage() {
  const t = await getTranslations('common');
  return <h1>{t('mi_seccion.mi_clave')}</h1>;
}
```

**Client Components:**
```typescript
'use client';
import { useTranslation } from '@/lib/i18n/client';

export function MyComponent() {
  const { t } = useTranslation('common');
  return <h1>{t('mi_seccion.mi_clave')}</h1>;
}
```

---

## 3. Prohibiciones

### 3.1 ❌ NO Hacer

- ❌ **NO** crear un segundo sistema i18n
- ❌ **NO** dejar strings visibles al usuario fuera de i18n
- ❌ **NO** usar fallbacks hardcodeados (excepto valores técnicos)
- ❌ **NO** duplicar traducciones en múltiples archivos
- ❌ **NO** usar strings hardcodeados en JSX/TSX

### 3.2 ✅ Excepciones Permitidas

- ✅ Valores técnicos (IDs, URLs, nombres de archivos)
- ✅ Logs de consola (`console.log`, `console.error`)
- ✅ Nombres de marca (pueden ser hardcodeados o en i18n según necesidad)
- ✅ Valores de configuración técnica

---

## 4. Convenciones

### 4.1 Nomenclatura de Claves

- Usar `snake_case` para claves
- Agrupar por funcionalidad: `section.subsection.key`
- Mantener consistencia con claves existentes

**Ejemplos:**
- `auth.login_title`
- `errors.network_error`
- `settings.general.title`
- `agents.create_description`

### 4.2 Parámetros en Traducciones

Usar `{{paramName}}` para parámetros dinámicos:

```json
{
  "welcome": "Bienvenido, {{name}}"
}
```

```typescript
t('welcome', { name: 'Juan' })
// Resultado: "Bienvenido, Juan"
```

### 4.3 Pluralización

Usar claves separadas para singular/plural:

```json
{
  "message_count": "{{count}} mensaje",
  "message_count_plural": "{{count}} mensajes"
}
```

```typescript
const count = 5;
t(count === 1 ? 'message_count' : 'message_count_plural', { count })
```

---

## 5. Checklist para Nuevas Funcionalidades

Al agregar una nueva funcionalidad:

- [ ] Identificar todos los strings visibles al usuario
- [ ] Agregar claves a `es/common.json` o `es/landing.json`
- [ ] Agregar traducciones en inglés a `en/common.json` o `en/landing.json`
- [ ] Reemplazar strings hardcodeados por `t('clave')`
- [ ] Verificar que no hay fallbacks hardcodeados
- [ ] Probar navegación ES/EN
- [ ] Verificar build sin errores

---

## 6. Troubleshooting

### 6.1 Clave no encontrada

Si una clave no existe, el sistema devuelve la clave misma como fallback. Para debuggear:

```typescript
// El sistema mostrará un warning en consola:
// "Translation key not found: common.mi_seccion.mi_clave"
```

**Solución:** Agregar la clave faltante a los archivos JSON.

### 6.2 Traducción no se actualiza

1. Verificar que la clave existe en el namespace correcto
2. Verificar que se está usando el namespace correcto en `getTranslations()` o `useTranslation()`
3. Limpiar cache del navegador
4. Verificar que el locale está correctamente configurado

### 6.3 Build falla

Si el build falla por imports de traducciones:

1. Verificar que todos los archivos JSON están en `apps/web/lib/i18n/locales/{locale}/`
2. Verificar que `translations.ts` importa todos los archivos
3. Verificar que no hay errores de sintaxis en los JSON

---

## 7. Mantenimiento

### 7.1 Agregar un Nuevo Idioma

1. Crear carpeta `apps/web/lib/i18n/locales/{nuevo_locale}/`
2. Copiar estructura de `es/common.json` y `es/landing.json`
3. Traducir todas las claves
4. Agregar imports en `translations.ts`
5. Agregar el locale a `supportedLocales` en `index.ts`

### 7.2 Agregar un Nuevo Namespace

1. Crear archivo `apps/web/lib/i18n/locales/{locale}/{nuevo_namespace}.json`
2. Agregar imports en `translations.ts`
3. Actualizar tipo `TranslationNamespace` en `translations.ts`

---

## 8. Ejemplos Completos

### 8.1 Agregar Nueva Sección

**1. Agregar claves a JSON:**
```json
// es/common.json
{
  "mi_nueva_seccion": {
    "titulo": "Mi Nueva Sección",
    "descripcion": "Descripción de la nueva sección",
    "boton_guardar": "Guardar"
  }
}
```

**2. Usar en componente:**
```typescript
'use client';
import { useTranslation } from '@/lib/i18n/client';

export function MiComponente() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('mi_nueva_seccion.titulo')}</h1>
      <p>{t('mi_nueva_seccion.descripcion')}</p>
      <button>{t('mi_nueva_seccion.boton_guardar')}</button>
    </div>
  );
}
```

### 8.2 Agregar Mensaje de Error

**1. Agregar clave:**
```json
// es/common.json
{
  "errors": {
    "mi_nuevo_error": "Ocurrió un error al procesar la solicitud"
  }
}
```

**2. Usar:**
```typescript
toast({
  title: t('errors.generic'),
  description: t('errors.mi_nuevo_error'),
  variant: 'destructive',
});
```

---

## 9. Referencias

- **Reporte de Auditoría:** `docs/AUDIT/I18N-REPORT.md`
- **Código fuente:** `apps/web/lib/i18n/`
- **Traducciones:** `apps/web/lib/i18n/locales/`

---

**Última actualización:** 2025-01-27


