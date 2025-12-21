import { Injectable, Logger } from '@nestjs/common';
import { Express } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { DataResidencyService } from '../gdpr/services/data-residency.service';

@Injectable()
export class S3StorageService extends StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly defaultRegion: string;
  private readonly defaultBucket: string;
  private s3Clients: Map<string, S3Client> = new Map();

  constructor(private dataResidencyService: DataResidencyService) {
    super();
    this.defaultRegion = process.env.AWS_REGION || 'us-east-1';
    this.defaultBucket = process.env.AWS_S3_BUCKET || '';
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      this.logger.warn('⚠️ AWS credentials not configured. S3StorageService will not work properly.');
    }

    // Crear cliente por defecto
    this.getOrCreateS3Client(this.defaultRegion);
  }

  /**
   * Obtiene o crea un cliente S3 para una región específica
   */
  private getOrCreateS3Client(region: string): S3Client {
    if (!this.s3Clients.has(region)) {
      this.s3Clients.set(
        region,
        new S3Client({
          region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          },
        }),
      );
    }
    return this.s3Clients.get(region)!;
  }

  /**
   * Sube un archivo a S3 respetando la región de datos del tenant
   * 
   * @param file Archivo a subir
   * @param filePath Ruta del archivo
   * @param tenantId ID del tenant (opcional, para validar data residency)
   */
  async upload(file: Express.Multer.File, filePath: string, tenantId?: string): Promise<string> {
    let region = this.defaultRegion;
    let bucket = this.defaultBucket;

    // Si hay tenantId, usar la región configurada para data residency
    if (tenantId) {
      try {
        region = await this.dataResidencyService.getAwsRegionForTenant(tenantId);
        bucket = await this.dataResidencyService.getS3BucketForTenant(tenantId);
        
        // Validar que la región es correcta
        await this.dataResidencyService.validateStorageRegion(tenantId, region);
      } catch (error) {
        this.logger.warn(
          `Data residency validation failed for tenant ${tenantId}, using default region: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continuar con región por defecto si falla la validación
      }
    }

    const s3Client = this.getOrCreateS3Client(region);
    const key = `tenants/${filePath}`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // O usar bucket policy para acceso público
      }),
    );

    this.logger.log(`File uploaded to S3: ${bucket}/${key} in region ${region}${tenantId ? ` (tenant: ${tenantId})` : ''}`);

    // Retornar URL pública
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Elimina un archivo de S3
   * 
   * @param filePath Ruta del archivo o URL
   * @param tenantId ID del tenant (opcional, para usar bucket correcto)
   */
  async delete(filePath: string, tenantId?: string): Promise<void> {
    // Extraer key de URL o path
    let key = filePath;
    let region = this.defaultRegion;
    let bucket = this.defaultBucket;
    
    if (filePath.startsWith('http')) {
      // Extraer región y bucket de URL S3
      const urlMatch = filePath.match(/https?:\/\/([^\.]+)\.s3\.([^\.]+)\.amazonaws\.com\/(.+)$/);
      if (urlMatch) {
        bucket = urlMatch[1];
        region = urlMatch[2];
        key = urlMatch[3];
      } else {
        // Intentar extraer de URL genérica
        const urlObj = new URL(filePath);
        key = urlObj.pathname.replace(/^\//, '');
      }
    } else {
      // Si es path relativo, agregar prefijo tenants/
      key = filePath.replace(/^\/uploads\//, '').replace(/^tenants\//, 'tenants/');
      if (!key.startsWith('tenants/')) {
        key = `tenants/${key}`;
      }
      
      // Si hay tenantId, usar la región configurada
      if (tenantId) {
        try {
          region = await this.dataResidencyService.getAwsRegionForTenant(tenantId);
          bucket = await this.dataResidencyService.getS3BucketForTenant(tenantId);
        } catch (error) {
          this.logger.warn(
            `Could not determine region for tenant ${tenantId}, using default: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }
    
    const s3Client = this.getOrCreateS3Client(region);
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  /**
   * Obtiene la URL pública de un archivo
   * 
   * @param filePath Ruta del archivo
   * @param tenantId ID del tenant (opcional, para usar bucket correcto)
   */
  async getUrl(filePath: string, tenantId?: string): Promise<string> {
    // Si ya es URL completa, retornar
    if (filePath.startsWith('http')) {
      return filePath;
    }
    
    let region = this.defaultRegion;
    let bucket = this.defaultBucket;
    
    // Si hay tenantId, usar la región configurada
    if (tenantId) {
      try {
        region = await this.dataResidencyService.getAwsRegionForTenant(tenantId);
        bucket = await this.dataResidencyService.getS3BucketForTenant(tenantId);
      } catch (error) {
        this.logger.warn(
          `Could not determine region for tenant ${tenantId}, using default: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
    
    // Construir URL pública
    const key = filePath.replace(/^\/uploads\//, '').replace(/^tenants\//, 'tenants/');
    if (!key.startsWith('tenants/')) {
      return `https://${bucket}.s3.${region}.amazonaws.com/tenants/${key}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
