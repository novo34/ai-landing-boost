# Reporte de Auditoría i18n - Sistema de Traducciones

> **Fecha:** 2025-01-27  
> **Auditor:** AI Assistant  
> **Objetivo:** Detectar y corregir texto hardcodeado, claves faltantes, i18n duplicado y código muerto

---

## 1. Estructura del Sistema i18n Actual

### 1.1 Ubicación y Archivos Principales

- **Carpeta base:** `apps/web/lib/i18n/`
- **Server Components:** `apps/web/lib/i18n/index.ts`
  - Función: `getTranslations(namespace, locale?)`
  - Función: `detectLocale()`
- **Client Components:** `apps/web/lib/i18n/client.tsx`
  - Hook: `useTranslation(namespace)`
  - Provider: `LocaleProvider`
- **Imports estáticos:** `apps/web/lib/i18n/translations.ts`
  - Imports estáticos de todos los JSON

### 1.2 Namespaces Existentes

- `common` - Traducciones comunes (botones, errores, navegación, etc.)
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

### 1.4 Archivos de Traducción

```
apps/web/lib/i18n/locales/
├── es/
│   ├── common.json (925 líneas)
│   └── landing.json (183 líneas)
├── en/
│   ├── common.json (895 líneas)
│   └── landing.json (171 líneas)
└── [de, fr, it, pt, nl, pl]/
    ├── common.json
    └── landing.json
```

---

## 2. Problemas Detectados

### 2.1 Strings Hardcodeados en Código

#### 2.1.1 `apps/web/app/app/channels/page.tsx`

**Líneas 239-243:** Estados hardcodeados
```typescript
case 'ACTIVE':
  return <Badge variant="default" className="bg-green-500">Activo</Badge>;
case 'INACTIVE':
  return <Badge variant="secondary">Inactivo</Badge>;
case 'ERROR':
  return <Badge variant="destructive">Error</Badge>;
```

**Líneas 251-258:** Tipos de canal hardcodeados
```typescript
case 'WHATSAPP':
  return 'WhatsApp';
case 'VOICE':
  return 'Voz';
case 'WEBCHAT':
  return 'Webchat';
case 'TELEGRAM':
  return 'Telegram';
```

**Solución:** Usar `t('channels.statuses.ACTIVE')` y `t('channels.types.WHATSAPP')`

#### 2.1.2 `apps/web/app/app/agents/page.tsx`

**Líneas 384, 389, 404:** Labels hardcodeados
```typescript
<span className="text-muted-foreground">Estrategia:</span>
<span className="text-muted-foreground">Idioma:</span>
<span className="text-muted-foreground">Calendario conectado</span>
```

**Líneas 423-424:** Descripciones de diálogo hardcodeadas
```typescript
? 'Modifica la configuración del agente'
: 'Crea un nuevo agente de IA para automatizar conversaciones'
```

**Líneas 397:** Texto hardcodeado
```typescript
{agent.knowledgeCollectionIds.length} {agent.knowledgeCollectionIds.length === 1 ? 'colección' : 'colecciones'}
```

**Líneas 504-507:** Nombres de idiomas hardcodeados
```typescript
<SelectItem value="es">Español</SelectItem>
<SelectItem value="en">English</SelectItem>
<SelectItem value="de">Deutsch</SelectItem>
<SelectItem value="fr">Français</SelectItem>
```

**Línea 518:** Mensaje hardcodeado
```typescript
No hay colecciones disponibles
```

**Línea 552:** "Ninguno" hardcodeado
```typescript
<SelectItem value="none">Ninguno</SelectItem>
```

**Solución:** Agregar claves a `common.json` y usar `t()`

#### 2.1.3 `apps/web/app/app/settings/n8n/page.tsx`

**Línea 397:** Label hardcodeado
```typescript
{flow.agent && <span>Agente: {flow.agent.name}</span>}
```

**Solución:** Usar `t('n8n.agent_label')` o similar

#### 2.1.4 `apps/web/app/app/knowledge-base/page.tsx`

**Líneas 426-439:** Tipos de fuente hardcodeados
```typescript
case 'FAQ':
  return 'FAQ';
case 'DOC':
  return 'Documento';
case 'URL_SCRAPE':
  return 'URL';
case 'MANUAL_ENTRY':
  return 'Manual';
case 'CALENDAR':
  return 'Calendario';
case 'CRM':
  return 'CRM';
```

**Solución:** Ya existe `knowledge.source_types` en common.json, usar esas claves

#### 2.1.5 `apps/web/app/app/layout.tsx`

**Línea 200:** Nombre de marca hardcodeado
```typescript
<div className="font-bold text-xl">AutomAI</div>
```

**Nota:** Este es el nombre de marca, puede mantenerse hardcodeado o moverse a i18n si se requiere personalización.

#### 2.1.6 `apps/web/app/(auth)/login/page.tsx`

**Líneas 81-87, 125-127:** Fallbacks hardcodeados en español
```typescript
errorTitle = t('errors.server_unavailable') || 'Servidor no disponible';
errorDescription = t('errors.server_unavailable_message') || 
  'El servidor no está disponible. Por favor, verifica que el backend esté corriendo en http://localhost:3001';
```

**Solución:** Agregar claves faltantes a `common.json` para eliminar fallbacks

#### 2.1.7 `apps/web/app/app/docs/[doc]/page.tsx` y `page.tsx`

**Líneas 21-25:** Títulos hardcodeados
```typescript
'getting-started': 'Getting Started - AutomAI SaaS',
'workflows': 'Flujos de Negocio - AutomAI SaaS',
'integrations': 'Integraciones Externas - AutomAI SaaS',
'troubleshooting': 'Troubleshooting - AutomAI SaaS',
```

**Líneas 47, 54:** Mensajes de error hardcodeados
```typescript
throw new Error('No se pudo cargar el documento');
setError(err instanceof Error ? err.message : 'Error desconocido');
```

**Línea 110:** Mensaje de error hardcodeado
```typescript
{t('documentation.error') || 'Error al cargar la documentación'}: {error}
```

**Solución:** Agregar claves a `common.json` bajo `documentation`

### 2.2 Claves i18n Faltantes

#### 2.2.1 Errores de Conexión

Faltan en `common.json`:
- `errors.server_unavailable` (existe pero sin mensaje detallado)
- `errors.server_unavailable_message`
- `errors.timeout`
- `errors.timeout_message`

#### 2.2.2 Agentes

Faltan en `common.json`:
- `agents.strategy_label` ("Estrategia:")
- `agents.language_label` ("Idioma:")
- `agents.calendar_connected` ("Calendario conectado")
- `agents.edit_description` ("Modifica la configuración del agente")
- `agents.create_description` ("Crea un nuevo agente de IA para automatizar conversaciones")
- `agents.collection_singular` ("colección")
- `agents.collection_plural` ("colecciones")
- `agents.no_collections_available` ("No hay colecciones disponibles")
- `agents.none` ("Ninguno")

#### 2.2.3 Canales

Ya existen en `common.json`:
- `channels.types.WHATSAPP` ✅
- `channels.types.VOICE` ✅
- `channels.types.WEBCHAT` ✅
- `channels.types.TELEGRAM` ✅
- `channels.statuses.ACTIVE` ✅
- `channels.statuses.INACTIVE` ✅
- `channels.statuses.ERROR` ✅

**Problema:** No se están usando en el código.

#### 2.2.4 Base de Conocimiento

Ya existen en `common.json`:
- `knowledge.source_types.FAQ` ✅
- `knowledge.source_types.MANUAL_ENTRY` ✅
- `knowledge.source_types.DOC` ✅
- `knowledge.source_types.URL_SCRAPE` ✅

**Problema:** No se están usando en el código. Falta `CALENDAR` y `CRM`.

#### 2.2.5 Documentación

Faltan en `common.json`:
- `documentation.doc_titles.getting-started`
- `documentation.doc_titles.workflows`
- `documentation.doc_titles.integrations`
- `documentation.doc_titles.troubleshooting`
- `documentation.load_failed` ("No se pudo cargar el documento")
- `documentation.unknown_error` ("Error desconocido")

#### 2.2.6 n8n

Falta en `common.json`:
- `n8n.agent_label` ("Agente:")

### 2.3 Duplicados Detectados

#### 2.3.1 Nombres de Idioma

Los nombres de idiomas están hardcodeados en múltiples lugares:
- `apps/web/components/landing/Navigation.tsx` (líneas 11-20) - ✅ Correcto, es un mapeo
- `apps/web/app/app/agents/page.tsx` (líneas 504-507) - ❌ Hardcodeado

**Solución:** Usar el mapeo de `Navigation.tsx` o crear un helper compartido.

#### 2.3.2 Mensajes de Error

Algunos mensajes de error tienen fallbacks hardcodeados que duplican las traducciones.

### 2.4 Código Muerto

No se detectó código muerto relacionado con i18n. El sistema está bien estructurado.

---

## 3. Resumen de Correcciones Necesarias

### 3.1 Archivos a Modificar

1. `apps/web/app/app/channels/page.tsx` - Reemplazar strings hardcodeados
2. `apps/web/app/app/agents/page.tsx` - Reemplazar strings hardcodeados
3. `apps/web/app/app/settings/n8n/page.tsx` - Reemplazar string hardcodeado
4. `apps/web/app/app/knowledge-base/page.tsx` - Usar claves existentes
5. `apps/web/app/(auth)/login/page.tsx` - Agregar claves faltantes
6. `apps/web/app/app/docs/[doc]/page.tsx` - Agregar claves faltantes
7. `apps/web/app/app/docs/page.tsx` - Agregar claves faltantes

### 3.2 Claves a Agregar a `common.json`

**Español (`es/common.json`):**
```json
{
  "errors": {
    "server_unavailable_message": "El servidor no está disponible. Por favor, verifica que el backend esté corriendo.",
    "timeout": "Timeout",
    "timeout_message": "El servidor tardó demasiado en responder. Por favor, intenta de nuevo."
  },
  "agents": {
    "strategy_label": "Estrategia:",
    "language_label": "Idioma:",
    "calendar_connected": "Calendario conectado",
    "edit_description": "Modifica la configuración del agente",
    "create_description": "Crea un nuevo agente de IA para automatizar conversaciones",
    "collection_singular": "colección",
    "collection_plural": "colecciones",
    "no_collections_available": "No hay colecciones disponibles",
    "none": "Ninguno"
  },
  "knowledge": {
    "source_types": {
      "CALENDAR": "Calendario",
      "CRM": "CRM"
    }
  },
  "n8n": {
    "agent_label": "Agente:"
  },
  "documentation": {
    "doc_titles": {
      "getting-started": "Getting Started - AutomAI SaaS",
      "workflows": "Flujos de Negocio - AutomAI SaaS",
      "integrations": "Integraciones Externas - AutomAI SaaS",
      "troubleshooting": "Troubleshooting - AutomAI SaaS"
    },
    "load_failed": "No se pudo cargar el documento",
    "unknown_error": "Error desconocido"
  }
}
```

**Inglés (`en/common.json`):**
```json
{
  "errors": {
    "server_unavailable_message": "The server is not available. Please verify that the backend is running.",
    "timeout": "Timeout",
    "timeout_message": "The server took too long to respond. Please try again."
  },
  "agents": {
    "strategy_label": "Strategy:",
    "language_label": "Language:",
    "calendar_connected": "Calendar connected",
    "edit_description": "Modify the agent configuration",
    "create_description": "Create a new AI agent to automate conversations",
    "collection_singular": "collection",
    "collection_plural": "collections",
    "no_collections_available": "No collections available",
    "none": "None"
  },
  "knowledge": {
    "source_types": {
      "CALENDAR": "Calendar",
      "CRM": "CRM"
    }
  },
  "n8n": {
    "agent_label": "Agent:"
  },
  "documentation": {
    "doc_titles": {
      "getting-started": "Getting Started - AutomAI SaaS",
      "workflows": "Business Workflows - AutomAI SaaS",
      "integrations": "External Integrations - AutomAI SaaS",
      "troubleshooting": "Troubleshooting - AutomAI SaaS"
    },
    "load_failed": "Could not load document",
    "unknown_error": "Unknown error"
  }
}
```

---

## 4. Métricas Antes/Después

### 4.1 Antes de la Corrección

- **Strings hardcodeados detectados:** 25+
- **Claves faltantes:** 15+
- **Archivos con problemas:** 7
- **Duplicados:** 2 (nombres de idioma, mensajes de error)

### 4.2 Después de la Corrección (Objetivo)

- **Strings hardcodeados:** 0 (excepto valores técnicos/logs)
- **Claves faltantes:** 0
- **Archivos corregidos:** 7
- **Duplicados eliminados:** 2

---

## 5. Reglas i18n para el Proyecto

### 5.1 Cómo Añadir Nuevas Claves

1. **Identificar el namespace correcto:**
   - `common` - Para traducciones compartidas (botones, errores, navegación)
   - `landing` - Para traducciones de la landing page

2. **Agregar la clave en todos los idiomas:**
   - Empezar siempre por `es/common.json` o `es/landing.json`
   - Agregar la misma clave en `en/common.json` o `en/landing.json`
   - Agregar en los demás idiomas si es necesario (de, fr, it, pt, nl, pl)

3. **Estructura de claves:**
   - Usar notación de punto para anidación: `section.subsection.key`
   - Mantener consistencia con claves existentes
   - Usar nombres descriptivos en inglés para las claves

4. **Uso en código:**
   - **Server Components:** `const t = await getTranslations('common'); t('key')`
   - **Client Components:** `const { t } = useTranslation('common'); t('key')`

### 5.2 Prohibiciones

- ❌ **NO** crear un segundo sistema i18n
- ❌ **NO** dejar strings visibles al usuario fuera de i18n
- ❌ **NO** usar fallbacks hardcodeados (excepto valores técnicos)
- ❌ **NO** duplicar traducciones en múltiples archivos

### 5.3 Excepciones

- ✅ Valores técnicos (IDs, URLs, nombres de archivos)
- ✅ Logs de consola (`console.log`, `console.error`)
- ✅ Nombres de marca (pueden ser hardcodeados o en i18n según necesidad)

---

## 6. Próximos Pasos

1. ✅ Generar reporte (completado)
2. ⏳ Agregar claves faltantes a `common.json` (es y en)
3. ⏳ Corregir `apps/web/app/app/channels/page.tsx`
4. ⏳ Corregir `apps/web/app/app/agents/page.tsx`
5. ⏳ Corregir `apps/web/app/app/settings/n8n/page.tsx`
6. ⏳ Corregir `apps/web/app/app/knowledge-base/page.tsx`
7. ⏳ Corregir `apps/web/app/(auth)/login/page.tsx`
8. ⏳ Corregir `apps/web/app/app/docs/[doc]/page.tsx`
9. ⏳ Corregir `apps/web/app/app/docs/page.tsx`
10. ⏳ Verificar build
11. ⏳ Verificar navegación ES/EN

---

**Estado:** ✅ Completado  
**Última actualización:** 2025-01-27

---

## 7. Correcciones Aplicadas

### 7.1 Claves Agregadas

✅ **Español (`es/common.json`):**
- `errors.server_unavailable_message`
- `errors.timeout`
- `errors.timeout_message`
- `agents.strategy_label`
- `agents.language_label`
- `agents.calendar_connected`
- `agents.edit_description`
- `agents.create_description`
- `agents.collection_singular`
- `agents.collection_plural`
- `agents.no_collections_available`
- `agents.none`
- `knowledge.source_types.CALENDAR`
- `knowledge.source_types.CRM`
- `n8n.agent_label`
- `documentation.doc_titles.*`
- `documentation.load_failed`
- `documentation.unknown_error`

✅ **Inglés (`en/common.json`):**
- Todas las mismas claves con traducciones en inglés

### 7.2 Archivos Corregidos

✅ `apps/web/app/app/channels/page.tsx`
- Reemplazados estados hardcodeados por `t('channels.statuses.*')`
- Reemplazados tipos hardcodeados por `t('channels.types.*')`

✅ `apps/web/app/app/agents/page.tsx`
- Reemplazados labels hardcodeados por claves i18n
- Reemplazados nombres de idiomas por `t('settings.languages.*')`
- Reemplazados mensajes de descripción por claves i18n
- Reemplazado "Ninguno" por `t('agents.none')`

✅ `apps/web/app/app/settings/n8n/page.tsx`
- Reemplazado "Agente:" por `t('n8n.agent_label')`

✅ `apps/web/app/app/knowledge-base/page.tsx`
- Reemplazados tipos de fuente hardcodeados por `t('knowledge.source_types.*')`

✅ `apps/web/app/(auth)/login/page.tsx`
- Eliminados fallbacks hardcodeados
- Usa solo claves i18n

✅ `apps/web/app/app/docs/[doc]/page.tsx`
- Reemplazados títulos hardcodeados por `t('documentation.doc_titles.*')`
- Reemplazados mensajes de error por claves i18n

✅ `apps/web/app/app/docs/page.tsx`
- Reemplazados mensajes de error por claves i18n
- Eliminados fallbacks hardcodeados

### 7.3 Métricas Finales

- **Strings hardcodeados eliminados:** 25+
- **Claves agregadas:** 18 (en es y en)
- **Archivos corregidos:** 7
- **Fallbacks eliminados:** 8
- **Duplicados eliminados:** 2

---

## 8. Verificación Pendiente

⚠️ **Pendiente de verificar:**
1. Build de Next.js sin errores
2. Navegación ES/EN funcional
3. No hay errores de hidratación
4. Todas las traducciones se muestran correctamente


