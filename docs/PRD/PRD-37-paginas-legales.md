# PRD-37: Páginas Legales

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Seguridad y Compliance  
> **Dependencias:** Ninguna

---

## Objetivo

Crear páginas legales públicas (Aviso Legal, Política de Privacidad, Política de Cookies, Términos y Condiciones) requeridas para cumplimiento GDPR/FADP en regiones EU y Suiza.

---

## Alcance INCLUIDO

- ✅ Página de Aviso Legal
- ✅ Página de Política de Privacidad
- ✅ Página de Política de Cookies
- ✅ Página de Términos y Condiciones
- ✅ Generación dinámica según región (EU/CH)
- ✅ Banner de consentimiento de cookies
- ✅ Links en footer de landing
- ✅ Contenido editable por tenant (opcional, futuro)

---

## Alcance EXCLUIDO

- ❌ Editor WYSIWYG para contenido legal (queda para futuro)
- ❌ Múltiples idiomas en páginas legales (solo ES/EN por ahora)
- ❌ Versiones históricas de políticas (queda para futuro)
- ❌ Tracking de aceptación de términos (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Página de Aviso Legal

**Descripción:** Página pública con información legal de la empresa.

**Contenido:**
- Datos de la empresa (nombre, dirección, CIF/NIF)
- Responsable del sitio
- Condiciones de uso del sitio web
- Propiedad intelectual
- Limitación de responsabilidad
- Legislación aplicable

**URL:** `/legal/aviso-legal`

**Acceso:** Público (sin autenticación)

---

### RF-02: Página de Política de Privacidad

**Descripción:** Página pública explicando cómo se tratan los datos personales.

**Contenido:**
- Responsable del tratamiento
- Datos recopilados
- Finalidad del tratamiento
- Base legal
- Conservación de datos
- Derechos del usuario (acceso, rectificación, supresión, etc.)
- Transferencias internacionales
- Contacto del DPO (si aplica)

**URL:** `/legal/privacidad`

**Acceso:** Público (sin autenticación)

**Variantes:**
- Versión EU (GDPR)
- Versión CH (FADP)

---

### RF-03: Página de Política de Cookies

**Descripción:** Página pública explicando el uso de cookies.

**Contenido:**
- Qué son las cookies
- Tipos de cookies utilizadas
- Cookies técnicas (necesarias)
- Cookies analíticas (opcionales)
- Cookies de marketing (opcionales)
- Cómo desactivar cookies
- Cookies de terceros

**URL:** `/legal/cookies`

**Acceso:** Público (sin autenticación)

---

### RF-04: Página de Términos y Condiciones

**Descripción:** Página pública con términos de uso del servicio.

**Contenido:**
- Aceptación de términos
- Descripción del servicio
- Cuentas de usuario
- Uso aceptable
- Propiedad intelectual
- Limitación de responsabilidad
- Modificaciones de términos
- Ley aplicable y jurisdicción

**URL:** `/legal/terminos`

**Acceso:** Público (sin autenticación)

---

### RF-05: Banner de Consentimiento de Cookies

**Descripción:** Banner que aparece en la landing page solicitando consentimiento de cookies.

**Funcionalidades:**
- Aparece en primera visita (si no hay consentimiento)
- Opciones: "Aceptar todas", "Rechazar todas", "Personalizar"
- Guardar preferencia en localStorage
- No mostrar si ya hay consentimiento guardado
- Link a política de cookies

**Comportamiento:**
- Cookies técnicas: siempre activas (no requieren consentimiento)
- Cookies analíticas: requieren consentimiento
- Cookies de marketing: requieren consentimiento

---

### RF-06: Links en Footer

**Descripción:** Agregar links a páginas legales en el footer de la landing.

**Links:**
- Aviso Legal
- Política de Privacidad
- Política de Cookies
- Términos y Condiciones

**Ubicación:** Footer de `apps/web/app/page.tsx` (landing)

---

## Requisitos Técnicos

### RT-01: Estructura de Páginas

```
apps/web/app/
├── legal/
│   ├── aviso-legal/
│   │   └── page.tsx
│   ├── privacidad/
│   │   └── page.tsx
│   ├── cookies/
│   │   └── page.tsx
│   └── terminos/
│       └── page.tsx
```

---

### RT-02: Generación Dinámica por Región

**Lógica:**
- Detectar región del tenant (EU o CH)
- Mostrar contenido específico según región
- Usar componentes compartidos con variantes

**Implementación:**
- Componente `LegalContent` que recibe `region` como prop
- Contenido en archivos de traducción o componentes separados

---

## Flujos UX

### Flujo 1: Usuario Visita Landing

```
[Usuario visita landing]
  ↓
[Banner de cookies aparece]
  ↓
[Usuario hace clic en "Aceptar"]
  ↓
[Preferencia se guarda en localStorage]
  ↓
[Banner desaparece]
  ↓
[Cookies analíticas se activan]
```

---

## Estructura de DB

No se requieren cambios en BD. El contenido puede ser estático o en archivos de traducción.

---

## Endpoints API

No se requieren endpoints nuevos. Las páginas son estáticas.

---

## Eventos n8n

No se emiten eventos nuevos.

---

## Criterios de Aceptación

- [ ] Todas las páginas legales están accesibles
- [ ] Contenido es apropiado para GDPR/FADP
- [ ] Banner de cookies funciona correctamente
- [ ] Links en footer funcionan
- [ ] Páginas son responsive
- [ ] Contenido se adapta según región (EU/CH)
- [ ] Preferencias de cookies se guardan correctamente

---

## Dependencias

Ninguna. Páginas independientes.

---

**Última actualización:** 2025-01-XX

