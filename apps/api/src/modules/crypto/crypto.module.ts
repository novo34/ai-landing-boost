import { Module, Global } from '@nestjs/common';
import { CryptoService } from './crypto.service';

@Global() // Módulo global para uso en toda la aplicación
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
