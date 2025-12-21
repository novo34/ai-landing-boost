# PRD-43: Exportación PDF de Analytics

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Analytics  
> **Dependencias:** PRD-39 (Métricas Avanzadas y Analytics)

---

## Objetivo

Agregar funcionalidad de exportación a PDF para los reportes de analytics, complementando la exportación CSV existente.

---

## Contexto

Actualmente el sistema solo permite exportar analytics en formato CSV. Los usuarios necesitan reportes en PDF para:
- Presentaciones ejecutivas
- Documentación formal
- Compartir con stakeholders
- Archivo permanente

---

## Alcance INCLUIDO

- ✅ Endpoint API para exportar analytics a PDF
- ✅ Generación de PDF con gráficos y tablas
- ✅ Opción en UI para descargar PDF
- ✅ PDF incluye: KPIs, gráficos, tablas de datos
- ✅ Branding del tenant en PDF (logo, colores)

---

## Alcance EXCLUIDO

- ❌ Múltiples formatos de PDF (solo formato estándar)
- ❌ Personalización avanzada de layout
- ❌ Programación de reportes automáticos (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Generación de PDF

**Descripción:** Generar PDF con datos de analytics.

**Contenido del PDF:**
1. Header con logo del tenant (si existe)
2. Título: "Reporte de Analytics"
3. Fecha de generación
4. KPIs principales (agentes, canales, conversaciones, mensajes)
5. Gráficos (si aplica)
6. Tablas de datos detallados
7. Footer con información del tenant

**Formato:**
- A4
- Orientación vertical
- Márgenes estándar
- Fuente legible

---

### RF-02: Endpoint API

**Descripción:** Endpoint para generar y descargar PDF.

**Endpoint:**
```
GET /analytics/export/pdf?startDate=...&endDate=...&format=...
```

**Parámetros:**
- `startDate` (opcional): Fecha inicio
- `endDate` (opcional): Fecha fin
- `format` (opcional): Formato de datos

**Respuesta:**
- Content-Type: `application/pdf`
- Headers: `Content-Disposition: attachment; filename="analytics-report.pdf"`

---

### RF-03: UI para Descargar PDF

**Descripción:** Botón en UI para descargar PDF.

**Ubicación:** Página de analytics (`/app/analytics`)

**Comportamiento:**
- Botón "Exportar PDF" junto a "Exportar CSV"
- Al hacer clic, descarga PDF
- Mostrar loading mientras se genera

---

## Requisitos Técnicos

### RT-01: Instalar Dependencias

**Archivo:** `apps/api/package.json`

**Dependencias:**
```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2"
  }
}
```

---

### RT-02: Crear PDFService

**Archivo:** `apps/api/src/modules/analytics/pdf.service.ts`

**Responsabilidades:**
- Generar PDF con datos de analytics
- Incluir gráficos (convertir a imagen o usar canvas)
- Aplicar branding del tenant

---

### RT-03: Agregar Endpoint en AnalyticsController

**Archivo:** `apps/api/src/modules/analytics/analytics.controller.ts`

**Endpoint:**
```typescript
@Get('export/pdf')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
async exportPdf(
  @CurrentTenant() tenant: { id: string },
  @Query() filters: ExportAnalyticsDto,
  @Res() res: Response,
) {
  // Generar PDF y retornar
}
```

---

## Flujos UX

### Flujo 1: Exportar PDF

```
[Usuario en página de analytics]
  ↓
[Usuario hace clic en "Exportar PDF"]
  ↓
[Sistema muestra loading]
  ↓
[API genera PDF]
  ↓
[PDF se descarga automáticamente]
  ↓
[Usuario puede abrir y compartir PDF]
```

---

## Estructura de DB

No se requieren cambios.

---

## Endpoints API

**Nuevo endpoint:**
- `GET /analytics/export/pdf` - Exportar analytics a PDF

---

## Criterios de Aceptación

- [ ] PDF se genera correctamente con todos los datos
- [ ] PDF incluye logo del tenant (si existe)
- [ ] PDF incluye KPIs principales
- [ ] PDF incluye tablas de datos
- [ ] PDF se descarga correctamente desde UI
- [ ] PDF tiene formato profesional
- [ ] Performance aceptable (generación < 5 segundos)

---

## Dependencias

- **PRD-39:** Métricas Avanzadas y Analytics (debe estar implementado)
- **PRD-38:** Personalización de Logo y Colores (para branding en PDF)

---

**Última actualización:** 2025-01-XX

