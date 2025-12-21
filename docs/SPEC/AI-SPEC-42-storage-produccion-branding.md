# AI-SPEC-42: Storage en Producción para Branding

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-42  
> **Estado:** Pendiente de Implementación

---

## Resumen Ejecutivo

Este SPEC detalla la implementación de almacenamiento en la nube (S3 o Cloudinary) para logos de branding, con fallback a filesystem local.

---

## Implementación Detallada

### 1. Crear StorageModule y StorageService Abstracto

**Archivo:** `apps/api/src/modules/storage/storage.interface.ts`

```typescript
export interface IStorageService {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
}
```

**Archivo:** `apps/api/src/modules/storage/storage.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';

@Injectable()
export abstract class StorageService implements IStorageService {
  abstract upload(file: Express.Multer.File, path: string): Promise<string>;
  abstract delete(path: string): Promise<void>;
  abstract getUrl(path: string): Promise<string>;
}
```

---

### 2. Implementar LocalStorageService

**Archivo:** `apps/api/src/modules/storage/local-storage.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadsDir = process.env.UPLOADS_DIR || './uploads';

  async upload(file: Express.Multer.File, filePath: string): Promise<string> {
    const fullPath = path.join(this.uploadsDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.buffer);
    return `/uploads/${filePath}`;
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadsDir, filePath.replace(/^\/uploads\//, ''));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getUrl(filePath: string): Promise<string> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return filePath.startsWith('http') ? filePath : `${frontendUrl}${filePath}`;
  }
}
```

---

### 3. Implementar S3StorageService

**Archivo:** `apps/api/src/modules/storage/s3-storage.service.ts`

**Primero instalar dependencias:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

@Injectable()
export class S3StorageService extends StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor() {
    super();
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = process.env.AWS_S3_BUCKET!;
  }

  async upload(file: Express.Multer.File, filePath: string): Promise<string> {
    const key = `tenants/${filePath}`;
    
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // O usar bucket policy
      }),
    );

    // Retornar URL pública
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  async delete(filePath: string): Promise<void> {
    const key = filePath.replace(/^https?:\/\/[^\/]+\//, '').replace(/^tenants\//, 'tenants/');
    
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getUrl(filePath: string): Promise<string> {
    // Si ya es URL completa, retornar
    if (filePath.startsWith('http')) {
      return filePath;
    }
    
    // Construir URL pública
    const key = filePath.replace(/^\/uploads\//, 'tenants/');
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
}
```

---

### 4. Implementar CloudinaryStorageService

**Archivo:** `apps/api/src/modules/storage/cloudinary-storage.service.ts`

**Primero instalar dependencias:**
```bash
npm install cloudinary
```

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { StorageService } from './storage.service';

@Injectable()
export class CloudinaryStorageService extends StorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor() {
    super();
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
    });
  }

  async upload(file: Express.Multer.File, filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `tenants/${filePath.split('/')[0]}`,
          public_id: path.basename(filePath, path.extname(filePath)),
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result!.secure_url);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(filePath: string): Promise<void> {
    // Extraer public_id de la URL
    const publicId = this.extractPublicId(filePath);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  }

  async getUrl(filePath: string): Promise<string> {
    // Cloudinary URLs ya son públicas
    return filePath;
  }

  private extractPublicId(url: string): string | null {
    const match = url.match(/\/([^\/]+)\.[^.]+$/);
    return match ? match[1] : null;
  }
}
```

---

### 5. Crear StorageModule con Factory

**Archivo:** `apps/api/src/modules/storage/storage.module.ts`

```typescript
import { Module, DynamicModule } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';

@Module({})
export class StorageModule {
  static forRoot(): DynamicModule {
    const provider = StorageModule.getStorageProvider();
    
    return {
      module: StorageModule,
      providers: [
        {
          provide: StorageService,
          useClass: provider,
        },
      ],
      exports: [StorageService],
    };
  }

  private static getStorageProvider(): typeof StorageService {
    const provider = process.env.STORAGE_PROVIDER || 'local';

    switch (provider) {
      case 's3':
        return S3StorageService;
      case 'cloudinary':
        return CloudinaryStorageService;
      default:
        return LocalStorageService;
    }
  }
}
```

---

### 6. Modificar TenantSettingsService

**Archivo:** `apps/api/src/modules/tenant-settings/tenant-settings.service.ts`

**Cambios:**

1. **Importar StorageService:**
```typescript
import { StorageService } from '../storage/storage.service';
```

2. **Inyectar en constructor:**
```typescript
constructor(
  private prisma: PrismaService,
  private storageService: StorageService, // NUEVO
) {}
```

3. **Modificar uploadLogo:**
```typescript
async uploadLogo(tenantId: string, file: Express.Multer.File) {
  // Validar tipo y tamaño (código existente)
  
  // Generar path
  const ext = path.extname(file.originalname);
  const filename = `logo${ext}`;
  const filePath = `tenants/${tenantId}/${filename}`;

  // Eliminar logo anterior si existe
  const settings = await this.prisma.tenantSettings.findUnique({
    where: { tenantId },
  });

  if (settings?.logoUrl) {
    try {
      await this.storageService.delete(settings.logoUrl);
    } catch (error) {
      this.logger.warn(`Could not delete old logo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Subir nuevo logo usando StorageService
  const publicUrl = await this.storageService.upload(file, filePath);

  // Actualizar settings
  await this.prisma.tenantSettings.upsert({
    where: { tenantId },
    update: { logoUrl: publicUrl },
    create: {
      tenantId,
      logoUrl: publicUrl,
      defaultLocale: 'es',
      timeZone: 'Europe/Madrid',
      country: 'ES',
      dataRegion: 'EU',
      whatsappProvider: 'NONE',
      calendarProvider: 'NONE',
    },
  });

  return {
    success: true,
    data: { logoUrl: publicUrl },
  };
}
```

4. **Modificar deleteLogo:**
```typescript
async deleteLogo(tenantId: string) {
  const settings = await this.prisma.tenantSettings.findUnique({
    where: { tenantId },
  });

  if (settings?.logoUrl) {
    try {
      await this.storageService.delete(settings.logoUrl);
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
```

---

### 7. Actualizar TenantSettingsModule

**Archivo:** `apps/api/src/modules/tenant-settings/tenant-settings.module.ts`

```typescript
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule.forRoot()], // Agregar StorageModule
  // ...
})
```

---

## Variables de Entorno

**Archivo:** `.env` o documentación

```env
# Storage Provider: 'local', 's3', o 'cloudinary'
STORAGE_PROVIDER=local

# AWS S3 (si STORAGE_PROVIDER=s3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Cloudinary (si STORAGE_PROVIDER=cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## Checklist de Implementación

- [ ] Crear StorageService interface y clase abstracta
- [ ] Implementar LocalStorageService
- [ ] Implementar S3StorageService
- [ ] Implementar CloudinaryStorageService
- [ ] Crear StorageModule con factory
- [ ] Modificar TenantSettingsService para usar StorageService
- [ ] Actualizar TenantSettingsModule
- [ ] Agregar variables de entorno
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Documentar configuración

---

**Última actualización:** 2025-01-XX

