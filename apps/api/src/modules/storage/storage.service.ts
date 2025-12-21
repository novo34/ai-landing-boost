import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import { Express } from 'express';

@Injectable()
export abstract class StorageService implements IStorageService {
  abstract upload(file: Express.Multer.File, path: string, tenantId?: string): Promise<string>;
  abstract delete(path: string, tenantId?: string): Promise<void>;
  abstract getUrl(path: string, tenantId?: string): Promise<string>;
}
