import { Express } from 'express';

export interface IStorageService {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
}
