# AI-SPEC-38: Personalización de Logo y Colores

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-38  
> **Prioridad:** 🟢 BAJA

---

## Arquitectura

### Módulos NestJS a Modificar

```
apps/api/src/
├── modules/
│   └── tenant-settings/
│       ├── tenant-settings.service.ts            [MODIFICAR]
│       └── tenant-settings.controller.ts         [MODIFICAR]
└── prisma/
    └── schema.prisma                              [MODIFICAR]
```

---

## Archivos a Crear/Modificar

### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar campos de branding a `TenantSettings`

```prisma
model TenantSettings {
  // ... campos existentes
  logoUrl       String?  // URL del logo subido
  primaryColor  String?  // Color primario en hex (#RRGGBB)
  secondaryColor String? // Color secundario en hex (#RRGGBB)
}
```

---

### 2. Modificar Tenant Settings Service

**Archivo:** `apps/api/src/modules/tenant-settings/tenant-settings.service.ts`

**Acción:** Agregar métodos para manejar logo y colores

```typescript
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TenantSettingsService {
  private readonly logger = new Logger(TenantSettingsService.name);
  private readonly uploadsDir = process.env.UPLOADS_DIR || './uploads';

  constructor(private prisma: PrismaService) {
    // Crear directorio de uploads si no existe
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Sube un logo para el tenant
   */
  async uploadLogo(tenantId: string, file: Express.Multer.File) {
    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.invalid_file_type',
        message: 'Only PNG, JPG, and SVG files are allowed',
      });
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.file_too_large',
        message: 'File size must be less than 5MB',
      });
    }

    // Crear directorio del tenant si no existe
    const tenantDir = path.join(this.uploadsDir, 'tenants', tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    // Generar nombre único
    const ext = path.extname(file.originalname);
    const filename = `logo${ext}`;
    const filepath = path.join(tenantDir, filename);

    // Eliminar logo anterior si existe
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (settings?.logoUrl) {
      try {
        const oldPath = settings.logoUrl.replace(process.env.FRONTEND_URL || '', '');
        if (fs.existsSync(path.join(this.uploadsDir, oldPath))) {
          fs.unlinkSync(path.join(this.uploadsDir, oldPath));
        }
      } catch (error) {
        this.logger.warn(`Could not delete old logo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Guardar archivo
    fs.writeFileSync(filepath, file.buffer);

    // Generar URL pública
    const publicUrl = `/uploads/tenants/${tenantId}/${filename}`;

    // Actualizar settings
    await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      update: { logoUrl: publicUrl },
      create: {
        tenantId,
        logoUrl: publicUrl,
      },
    });

    return {
      success: true,
      data: { logoUrl: publicUrl },
    };
  }

  /**
   * Elimina el logo del tenant
   */
  async deleteLogo(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (settings?.logoUrl) {
      try {
        const filepath = settings.logoUrl.replace(process.env.FRONTEND_URL || '', '');
        const fullPath = path.join(this.uploadsDir, filepath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (error) {
        this.logger.warn(`Could not delete logo file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await this.prisma.tenantSettings.update({
      where: { tenantId },
      data: { logoUrl: null },
    });

    return {
      success: true,
      data: { message: 'Logo deleted' },
    };
  }

  /**
   * Actualiza colores del tenant
   */
  async updateColors(
    tenantId: string,
    primaryColor?: string,
    secondaryColor?: string,
  ) {
    // Validar formato de colores (hex)
    if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.invalid_color_format',
        message: 'Color must be in hex format (#RRGGBB)',
      });
    }

    if (secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(secondaryColor)) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.invalid_color_format',
        message: 'Color must be in hex format (#RRGGBB)',
      });
    }

    const updateData: any = {};
    if (primaryColor !== undefined) {
      updateData.primaryColor = primaryColor;
    }
    if (secondaryColor !== undefined) {
      updateData.secondaryColor = secondaryColor;
    }

    await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      update: updateData,
      create: {
        tenantId,
        ...updateData,
      },
    });

    return {
      success: true,
      data: await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
      }),
    };
  }
}
```

---

### 3. Modificar Tenant Settings Controller

**Archivo:** `apps/api/src/modules/tenant-settings/tenant-settings.controller.ts`

**Acción:** Agregar endpoints para logo y colores

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';

/**
 * Sube un logo para el tenant
 */
@Post('logo')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
@UseInterceptors(FileInterceptor('logo'))
async uploadLogo(
  @CurrentTenant() tenant: { id: string; role: string },
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException({
      success: false,
      error_key: 'branding.no_file',
      message: 'No file uploaded',
    });
  }
  return this.tenantSettingsService.uploadLogo(tenant.id, file);
}

/**
 * Elimina el logo del tenant
 */
@Delete('logo')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
async deleteLogo(@CurrentTenant() tenant: { id: string; role: string }) {
  return this.tenantSettingsService.deleteLogo(tenant.id);
}

/**
 * Actualiza colores del tenant
 */
@Put('colors')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
async updateColors(
  @CurrentTenant() tenant: { id: string; role: string },
  @Body() dto: UpdateColorsDto,
) {
  return this.tenantSettingsService.updateColors(
    tenant.id,
    dto.primaryColor,
    dto.secondaryColor,
  );
}
```

---

### 4. Crear DTOs

**Archivo:** `apps/api/src/modules/tenant-settings/dto/update-colors.dto.ts`

```typescript
import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateColorsDto {
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'primaryColor must be a valid hex color (#RRGGBB)',
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'secondaryColor must be a valid hex color (#RRGGBB)',
  })
  secondaryColor?: string;
}
```

---

### 5. Configurar Multer

**Archivo:** `apps/api/src/modules/tenant-settings/tenant-settings.module.ts`

**Acción:** Configurar MulterModule

```typescript
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/tenants',
        filename: (req, file, cb) => {
          const tenantId = (req as any).tenant?.id;
          const ext = path.extname(file.originalname);
          cb(null, `${tenantId}/logo${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
    // ... otros imports
  ],
})
export class TenantSettingsModule {}
```

---

## Frontend - Página de Branding

### 6. Crear Página de Branding

**Archivo:** `apps/web/app/app/settings/branding/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Upload, X, Palette } from 'lucide-react';

export default function BrandingPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiClient.getTenantSettings();
      if (response.success && response.data) {
        setLogoUrl(response.data.logoUrl || null);
        setPrimaryColor(response.data.primaryColor || '#3b82f6');
        setSecondaryColor(response.data.secondaryColor || '#8b5cf6');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('errors.generic'),
        description: t('branding.invalid_file_type'),
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('errors.generic'),
        description: t('branding.file_too_large'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('logo', file);

      const response = await apiClient.uploadLogo(formData);
      if (response.success && response.data) {
        setLogoUrl(response.data.logoUrl);
        toast({
          title: t('branding.logo_uploaded'),
          description: t('branding.logo_uploaded_success'),
        });
        // Aplicar logo inmediatamente
        applyBranding();
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.upload_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      setLoading(true);
      const response = await apiClient.deleteLogo();
      if (response.success) {
        setLogoUrl(null);
        toast({
          title: t('branding.logo_deleted'),
          description: t('branding.logo_deleted_success'),
        });
        applyBranding();
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveColors = async () => {
    try {
      setLoading(true);
      const response = await apiClient.updateColors({
        primaryColor,
        secondaryColor,
      });
      if (response.success) {
        toast({
          title: t('branding.colors_updated'),
          description: t('branding.colors_updated_success'),
        });
        applyBranding();
      }
    } catch (error) {
      console.error('Error updating colors:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.save_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyBranding = () => {
    // Inyectar CSS variables
    const root = document.documentElement;
    if (primaryColor) {
      root.style.setProperty('--primary-color', primaryColor);
    }
    if (secondaryColor) {
      root.style.setProperty('--secondary-color', secondaryColor);
    }
  };

  useEffect(() => {
    applyBranding();
  }, [primaryColor, secondaryColor, preview]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('branding.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('branding.description')}
        </p>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>{t('branding.logo')}</CardTitle>
          <CardDescription>{t('branding.logo_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="relative inline-block">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-12 max-w-[200px] object-contain"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleLogoUpload}
              disabled={loading}
              className="hidden"
              id="logo-upload"
            />
            <Label htmlFor="logo-upload">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('branding.upload_logo')}
                </span>
              </Button>
            </Label>
            {logoUrl && (
              <Button variant="outline" onClick={handleDeleteLogo} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                {t('branding.delete_logo')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Colores */}
      <Card>
        <CardHeader>
          <CardTitle>{t('branding.colors')}</CardTitle>
          <CardDescription>{t('branding.colors_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t('branding.primary_color')}</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">{t('branding.secondary_color')}</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  placeholder="#8b5cf6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
          </div>

          {/* Vista Previa */}
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-2">{t('branding.preview')}</h3>
            <div className="space-y-2">
              <Button style={{ backgroundColor: primaryColor }}>
                {t('branding.preview_button')}
              </Button>
              <a
                href="#"
                style={{ color: primaryColor }}
                className="underline"
              >
                {t('branding.preview_link')}
              </a>
            </div>
          </div>

          <Button onClick={handleSaveColors} disabled={loading}>
            <Palette className="h-4 w-4 mr-2" />
            {t('branding.save_colors')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 7. Agregar Métodos al Cliente API

**Archivo:** `apps/web/lib/api/client.ts`

```typescript
/**
 * Sube un logo
 */
async uploadLogo(file: FormData): Promise<ApiResponse<{ logoUrl: string }>> {
  return this.post('/tenants/settings/logo', file, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Elimina el logo
 */
async deleteLogo(): Promise<ApiResponse<{ message: string }>> {
  return this.delete('/tenants/settings/logo');
}

/**
 * Actualiza colores
 */
async updateColors(data: {
  primaryColor?: string;
  secondaryColor?: string;
}): Promise<ApiResponse<TenantSettings>> {
  return this.put('/tenants/settings/colors', data);
}
```

---

### 8. Aplicar Branding en Layout

**Archivo:** `apps/web/app/app/layout.tsx`

**Acción:** Cargar settings y aplicar CSS variables

```typescript
'use client';

import { useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

export default function AppLayout({ children }) {
  useEffect(() => {
    // Cargar branding del tenant
    const loadBranding = async () => {
      try {
        const response = await apiClient.getTenantSettings();
        if (response.success && response.data) {
          const root = document.documentElement;
          if (response.data.primaryColor) {
            root.style.setProperty('--primary-color', response.data.primaryColor);
          }
          if (response.data.secondaryColor) {
            root.style.setProperty('--secondary-color', response.data.secondaryColor);
          }
        }
      } catch (error) {
        console.error('Error loading branding:', error);
      }
    };

    loadBranding();
  }, []);

  return <>{children}</>;
}
```

---

### 9. Aplicar Logo en Sidebar

**Archivo:** `apps/web/components/app/app-sidebar.tsx`

**Acción:** Mostrar logo personalizado si existe

```typescript
// En el componente, agregar:
const [logoUrl, setLogoUrl] = useState<string | null>(null);

useEffect(() => {
  const loadLogo = async () => {
    try {
      const response = await apiClient.getTenantSettings();
      if (response.success && response.data?.logoUrl) {
        setLogoUrl(response.data.logoUrl);
      }
    } catch (error) {
      // Ignorar error
    }
  };
  loadLogo();
}, []);

// En el render:
{logoUrl ? (
  <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
) : (
  <span className="font-bold text-xl">AI Landing</span>
)}
```

---

## DTOs

Ver sección 4.

---

## Validaciones

- **Logo:** Validar tipo (PNG, JPG, SVG) y tamaño (5MB)
- **Colores:** Validar formato hex (#RRGGBB)
- **Permisos:** Solo OWNER/ADMIN pueden modificar branding

---

## Errores Esperados

```typescript
- 'branding.invalid_file_type'
- 'branding.file_too_large'
- 'branding.invalid_color_format'
- 'branding.upload_failed'
```

---

## Test Plan

### Unit Tests

1. **TenantSettingsService:**
   - `uploadLogo` valida y guarda logo correctamente
   - `deleteLogo` elimina logo correctamente
   - `updateColors` valida y guarda colores correctamente
   - Validación de formatos funciona

### Integration Tests

1. **Flujo completo:**
   - Subir logo
   - Verificar que se guarda en BD
   - Verificar que aparece en UI
   - Actualizar colores
   - Verificar que se aplican en UI

---

## Checklist Final

- [ ] Prisma schema actualizado
- [ ] Migración Prisma creada
- [ ] TenantSettingsService actualizado
- [ ] TenantSettingsController actualizado
- [ ] MulterModule configurado
- [ ] DTOs creados
- [ ] Página de branding creada
- [ ] Cliente API actualizado
- [ ] Layout aplica branding
- [ ] Sidebar muestra logo
- [ ] CSS variables funcionan
- [ ] Tests escritos

---

## Dependencias de Paquetes

```json
{
  "dependencies": {
    "@nestjs/platform-express": "^10.0.0",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

---

## Notas de Implementación

- **Storage:** Para producción, considerar usar S3 o Cloudinary
- **CDN:** Servir logos desde CDN para mejor rendimiento
- **Cache:** Cachear logos en frontend para evitar requests repetidos
- **Responsive:** Asegurar que logo se adapta a diferentes tamaños

---

**Última actualización:** 2025-01-XX

