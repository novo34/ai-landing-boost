# PRD-42: Storage en Producción para Branding

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Infraestructura  
> **Dependencias:** PRD-38 (Personalización de Logo y Colores)

---

## Objetivo

Implementar almacenamiento en la nube (S3 o Cloudinary) para los logos de branding, permitiendo que funcionen correctamente en entornos de producción donde el filesystem local no es adecuado.

---

## Contexto

Actualmente el sistema usa filesystem local (`./uploads/tenants/{tenantId}/`) para almacenar logos. Esto funciona en desarrollo pero no es adecuado para producción porque:
- No es escalable
- No funciona en entornos serverless
- No permite CDN para mejor performance
- No es redundante

---

## Alcance INCLUIDO

- ✅ Integración con AWS S3 o Cloudinary
- ✅ Configuración mediante variables de entorno
- ✅ Fallback a filesystem local si no hay configuración de cloud
- ✅ Migración de logos existentes (opcional)
- ✅ URLs públicas para logos

---

## Alcance EXCLUIDO

- ❌ Migración automática de logos existentes (manual o script separado)
- ❌ Múltiples proveedores simultáneos (solo uno a la vez)
- ❌ Compresión/optimización automática de imágenes (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Soporte para AWS S3

**Descripción:** Permitir almacenar logos en AWS S3.

**Configuración requerida:**
- `STORAGE_PROVIDER=s3`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

**Funcionalidad:**
- Subir logo a S3 al crear/actualizar
- Eliminar logo de S3 al borrar
- Generar URL pública (presigned URL o URL pública)

---

### RF-02: Soporte para Cloudinary

**Descripción:** Permitir almacenar logos en Cloudinary como alternativa.

**Configuración requerida:**
- `STORAGE_PROVIDER=cloudinary`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Funcionalidad:**
- Subir logo a Cloudinary al crear/actualizar
- Eliminar logo de Cloudinary al borrar
- Generar URL pública optimizada

---

### RF-03: Fallback a Filesystem Local

**Descripción:** Si no hay configuración de cloud, usar filesystem local (comportamiento actual).

**Comportamiento:**
- Si `STORAGE_PROVIDER` no está configurado o es `local`, usar filesystem
- Mantener compatibilidad con implementación actual

---

## Requisitos Técnicos

### RT-01: Crear StorageService Abstracto

**Archivo:** `apps/api/src/modules/storage/storage.service.ts`

**Interfaz:**
```typescript
interface StorageService {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
}
```

---

### RT-02: Implementar S3StorageService

**Archivo:** `apps/api/src/modules/storage/s3-storage.service.ts`

**Dependencias:**
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

---

### RT-03: Implementar CloudinaryStorageService

**Archivo:** `apps/api/src/modules/storage/cloudinary-storage.service.ts`

**Dependencias:**
- `cloudinary`

---

### RT-04: Modificar TenantSettingsService

**Archivo:** `apps/api/src/modules/tenant-settings/tenant-settings.service.ts`

**Cambios:**
- Inyectar StorageService
- Usar StorageService en lugar de filesystem directo
- Mantener compatibilidad con código existente

---

## Flujos UX

### Flujo 1: Subir Logo con S3

```
[Usuario sube logo]
  ↓
[Sistema valida archivo]
  ↓
[StorageService sube a S3]
  ↓
[Se obtiene URL pública]
  ↓
[URL se guarda en BD]
  ↓
[Logo aparece en dashboard]
```

---

## Estructura de DB

No se requieren cambios. Se sigue usando `TenantSettings.logoUrl`.

---

## Endpoints API

No se requieren cambios. Endpoints existentes funcionan igual.

---

## Criterios de Aceptación

- [ ] Logos se suben a S3 cuando está configurado
- [ ] Logos se suben a Cloudinary cuando está configurado
- [ ] Logos se suben a filesystem local cuando no hay cloud configurado
- [ ] URLs públicas funcionan correctamente
- [ ] Eliminación de logos funciona en todos los proveedores
- [ ] Configuración mediante variables de entorno funciona

---

## Dependencias

- **PRD-38:** Personalización de Logo y Colores (debe estar implementado)

---

**Última actualización:** 2025-01-XX

