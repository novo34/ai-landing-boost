import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadsDir = process.env.UPLOADS_DIR || './uploads';

  async upload(file: Express.Multer.File, filePath: string, tenantId?: string): Promise<string> {
    const fullPath = path.join(this.uploadsDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.buffer);
    return `/uploads/${filePath}`;
  }

  async delete(filePath: string, tenantId?: string): Promise<void> {
    // Si es URL completa, extraer path relativo
    let relativePath = filePath;
    if (filePath.startsWith('http')) {
      // Extraer path de URL
      const urlObj = new URL(filePath);
      relativePath = urlObj.pathname;
    }
    
    // Remover prefijo /uploads/ si existe
    relativePath = relativePath.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.uploadsDir, relativePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getUrl(filePath: string, tenantId?: string): Promise<string> {
    // Si ya es URL completa, retornar
    if (filePath.startsWith('http')) {
      return filePath;
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl}${filePath}`;
  }
}
