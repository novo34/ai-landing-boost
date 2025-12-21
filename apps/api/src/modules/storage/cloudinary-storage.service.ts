import { Injectable, Logger } from '@nestjs/common';
import { Express } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import * as path from 'path';
import { StorageService } from './storage.service';

@Injectable()
export class CloudinaryStorageService extends StorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor() {
    super();
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      this.logger.warn('⚠️ Cloudinary credentials not configured. CloudinaryStorageService will not work properly.');
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
      api_key: process.env.CLOUDINARY_API_KEY || '',
      api_secret: process.env.CLOUDINARY_API_SECRET || '',
    });
  }

  async upload(file: Express.Multer.File, filePath: string, tenantId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Extraer folder y public_id del path
      const pathParts = filePath.split('/');
      const folder = pathParts.length > 1 ? `tenants/${pathParts[0]}` : 'tenants';
      const filename = pathParts[pathParts.length - 1];
      const publicId = path.basename(filename, path.extname(filename));

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
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

  async delete(filePath: string, tenantId?: string): Promise<void> {
    // Extraer public_id de la URL
    const publicId = this.extractPublicId(filePath);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  }

  async getUrl(filePath: string, tenantId?: string): Promise<string> {
    // Cloudinary URLs ya son públicas
    return filePath;
  }

  private extractPublicId(url: string): string | null {
    // Cloudinary URLs tienen formato: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{ext}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (match) {
      return match[1];
    }
    return null;
  }
}
