# PRD-38: Personalización de Logo y Colores

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Personalización y Branding  
> **Dependencias:** PRD-03

---

## Objetivo

Permitir a cada tenant personalizar su logo y colores de marca para aplicar branding consistente en el dashboard, emails y widget de webchat.

---

## Alcance INCLUIDO

- ✅ Subida de logo (imagen)
- ✅ Configuración de color primario
- ✅ Configuración de color secundario
- ✅ Vista previa de cambios
- ✅ Aplicación de branding en dashboard
- ✅ Aplicación de branding en sidebar
- ✅ Aplicación de branding en emails
- ✅ Aplicación de branding en widget de webchat

---

## Alcance EXCLUIDO

- ❌ Editor de logo avanzado (solo subida de imagen)
- ❌ Múltiples temas predefinidos (solo colores personalizados)
- ❌ Personalización de fuentes (queda para futuro)
- ❌ Personalización de layout (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Subida de Logo

**Descripción:** Los usuarios deben poder subir un logo personalizado.

**Requisitos:**
- Formatos soportados: PNG, JPG, SVG
- Tamaño máximo: 5MB
- Dimensiones recomendadas: 200x50px (para header)
- Validación de formato y tamaño
- Preview del logo antes de guardar
- Opción de eliminar logo (volver a default)

**Flujo:**
1. Usuario accede a Settings > Branding
2. Usuario hace clic en "Subir logo"
3. Usuario selecciona archivo
4. Sistema valida archivo
5. Sistema muestra preview
6. Usuario confirma
7. Sistema sube archivo a storage (S3, local, etc.)
8. Sistema guarda URL en `TenantSettings.logoUrl`
9. Logo aparece en dashboard inmediatamente

---

### RF-02: Configuración de Colores

**Descripción:** Los usuarios deben poder configurar colores primarios y secundarios.

**Colores:**
- Color primario: Usado para botones principales, links, acentos
- Color secundario: Usado para elementos secundarios, hover states

**UI:**
- Color picker para seleccionar colores
- Vista previa en tiempo real
- Valores hexadecimales (#RRGGBB)
- Validación de formato de color

**Flujo:**
1. Usuario selecciona color primario
2. Vista previa se actualiza automáticamente
3. Usuario selecciona color secundario
4. Vista previa se actualiza
5. Usuario guarda cambios
6. Colores se aplican en toda la aplicación

---

### RF-03: Aplicación de Branding

**Descripción:** El branding debe aplicarse en múltiples lugares de la aplicación.

**Lugares a aplicar:**

1. **Dashboard:**
   - Logo en header/sidebar
   - Colores en botones y links
   - Colores en acentos y highlights

2. **Sidebar:**
   - Logo en lugar de logo default
   - Colores en items activos

3. **Emails:**
   - Logo en header de emails
   - Colores en botones de email
   - Colores en links

4. **Widget de Webchat:**
   - Logo en header del widget
   - Colores en botón de chat
   - Colores en mensajes del agente

**Implementación:**
- CSS variables dinámicas
- Inyección de estilos en runtime
- Cacheo de assets (logo)

---

### RF-04: Vista Previa

**Descripción:** Los usuarios deben poder ver una vista previa antes de guardar.

**Componentes de preview:**
- Logo en diferentes tamaños
- Botones con colores seleccionados
- Links con colores seleccionados
- Cards con acentos

**Comportamiento:**
- Preview se actualiza en tiempo real
- No se aplica hasta que usuario guarda
- Botón "Cancelar" restaura valores anteriores

---

## Requisitos Técnicos

### RT-01: Modelo de Datos

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar campos a `TenantSettings`

```prisma
model TenantSettings {
  // ... campos existentes
  logoUrl       String?  // URL del logo subido
  primaryColor  String?  // Color primario en hex (#RRGGBB)
  secondaryColor String? // Color secundario en hex (#RRGGBB)
}
```

---

### RT-02: Storage de Archivos

**Opciones:**
- Local storage (para desarrollo)
- AWS S3 (para producción)
- Cloudinary (alternativa)

**Estructura:**
```
uploads/
  tenants/
    {tenantId}/
      logo.{ext}
```

---

### RT-03: Endpoints API

```
GET    /tenants/settings                    → Obtener settings (incluye branding)
PUT    /tenants/settings                    → Actualizar settings (incluye branding)
POST   /tenants/settings/logo               → Subir logo
DELETE /tenants/settings/logo               → Eliminar logo
```

---

### RT-04: CSS Variables Dinámicas

**Implementación:**
- Inyectar CSS variables en `<head>` basadas en `TenantSettings`
- Variables: `--primary-color`, `--secondary-color`
- Usar en componentes con `var(--primary-color)`

---

## Flujos UX

### Flujo 1: Subir Logo

```
[Usuario en Settings > Branding]
  ↓
[Usuario hace clic en "Subir logo"]
  ↓
[Input file se abre]
  ↓
[Usuario selecciona archivo]
  ↓
[Sistema valida archivo]
  ↓
[Preview se muestra]
  ↓
[Usuario confirma]
  ↓
[Logo se sube a storage]
  ↓
[URL se guarda en BD]
  ↓
[Logo aparece en dashboard]
```

---

## Estructura de DB

Ver RT-01.

---

## Endpoints API

Ver RT-03.

---

## Eventos n8n

No se emiten eventos nuevos.

---

## Criterios de Aceptación

- [ ] Usuarios pueden subir logo
- [ ] Logo se valida correctamente
- [ ] Logo aparece en dashboard y sidebar
- [ ] Usuarios pueden configurar colores
- [ ] Colores se aplican en toda la aplicación
- [ ] Vista previa funciona correctamente
- [ ] Branding se aplica en emails
- [ ] Branding se aplica en widget de webchat
- [ ] Eliminar logo funciona

---

## Dependencias

- PRD-03: Prisma Setup (para modificar schema)

---

**Última actualización:** 2025-01-XX

