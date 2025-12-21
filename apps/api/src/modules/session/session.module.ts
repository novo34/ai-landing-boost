import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [SessionController],
})
export class SessionModule {}
