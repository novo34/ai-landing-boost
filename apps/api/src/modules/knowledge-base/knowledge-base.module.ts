import { Module } from '@nestjs/common';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { DocumentProcessorService } from './services/document-processor.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService,
    DocumentProcessorService,
    SemanticSearchService,
  ],
  exports: [
    KnowledgeBaseService,
    DocumentProcessorService,
    SemanticSearchService,
  ],
})
export class KnowledgeBaseModule {}

