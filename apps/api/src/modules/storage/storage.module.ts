import { Module, DynamicModule, Type } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { GdprModule } from '../gdpr/gdpr.module';

@Module({})
export class StorageModule {
  static forRoot(): DynamicModule {
    const providerName = process.env.STORAGE_PROVIDER || 'local';
    const isS3 = providerName.toLowerCase() === 's3';
    
    // Si es S3StorageService, necesitamos importar GdprModule para DataResidencyService
    const imports = isS3 ? [GdprModule] : [];
    
    // Determinar qué clase usar
    let providerClass: Type<any>;
    switch (providerName.toLowerCase()) {
      case 's3':
        providerClass = S3StorageService;
        break;
      case 'cloudinary':
        providerClass = CloudinaryStorageService;
        break;
      default:
        providerClass = LocalStorageService;
        break;
    }
    
    return {
      module: StorageModule,
      imports,
      providers: [
        {
          provide: StorageService,
          useClass: providerClass,
        },
      ],
      exports: [StorageService],
    };
  }
}
