import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { $Enums, Prisma } from '@prisma/client';
import { createData } from '../../common/prisma/create-data.helper';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { ImportDocumentDto } from './dto/import-document.dto';
import { ImportUrlDto } from './dto/import-url.dto';
import { DocumentProcessorService } from './services/document-processor.service';
import { CacheService } from '../../common/cache/cache.service';
import axios from 'axios';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private prisma: PrismaService,
    private documentProcessor: DocumentProcessorService,
    private cache: CacheService,
  ) {}

  // ============================================
  // Collections CRUD
  // ============================================

  /**
   * Obtiene todas las colecciones del tenant
   * Optimizado con cache y select para reducir datos transferidos
   */
  async getCollections(tenantId: string) {
    const cacheKey = `knowledge-collections:${tenantId}`;
    
    // Verificar cache (2 minutos - las colecciones cambian poco)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query optimizada: usar select en lugar de include para reducir datos
    const collections = await this.prisma.knowledgecollection.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            knowledgesource: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mapear resultado para mantener compatibilidad con frontend
    const result = {
      success: true,
      data: collections.map((col) => ({
        ...col,
        knowledgesource: [], // Frontend puede calcular count desde _count
      })),
    };

    // Guardar en cache (2 minutos)
    this.cache.set(cacheKey, result, 2 * 60 * 1000);
    
    return result;
  }

  /**
   * Obtiene una colección específica por ID
   */
  async getCollectionById(tenantId: string, collectionId: string) {
        const collection = await this.prisma.knowledgecollection.findFirst({
      where: {
        id: collectionId,
        tenantId,
      },
      include: {
        knowledgesource: {
          include: {
            knowledgechunk: {
              select: {
                id: true,
                chunkIndex: true,
              },
            },
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException({
        success: false,
        error_key: 'knowledge.collection_not_found',
      });
    }

    return {
      success: true,
      data: collection,
    };
  }

  /**
   * Crea una nueva colección
   */
  async createCollection(tenantId: string, dto: CreateCollectionDto) {
        const collection = await this.prisma.knowledgecollection.create({
      data: createData({
        tenantId,
        name: dto.name,
        description: dto.description,
        language: dto.language,
      }),
    });

    // Invalidar cache de colecciones
    this.cache.delete(`knowledge-collections:${tenantId}`);

    return {
      success: true,
      data: collection,
    };
  }

  /**
   * Actualiza una colección
   */
  async updateCollection(
    tenantId: string,
    collectionId: string,
    dto: UpdateCollectionDto,
  ) {
        const collection = await this.prisma.knowledgecollection.findFirst({
      where: {
        id: collectionId,
        tenantId,
      },
    });

    if (!collection) {
      throw new NotFoundException({
        success: false,
        error_key: 'knowledge.collection_not_found',
      });
    }

        const updated = await this.prisma.knowledgecollection.update({
      where: { id: collectionId },
      data: {
        name: dto.name,
        description: dto.description,
        language: dto.language,
      },
    });

    // Invalidar cache de colecciones
    this.cache.delete(`knowledge-collections:${tenantId}`);

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Elimina una colección
   */
  async deleteCollection(tenantId: string, collectionId: string) {
        const collection = await this.prisma.knowledgecollection.findFirst({
      where: {
        id: collectionId,
        tenantId,
      },
    });

    if (!collection) {
      throw new NotFoundException({
        success: false,
        error_key: 'knowledge.collection_not_found',
      });
    }

        await this.prisma.knowledgecollection.delete({
      where: { id: collectionId },
    });

    // Invalidar cache de colecciones y fuentes
    this.cache.delete(`knowledge-collections:${tenantId}`);
    this.cache.delete(`knowledge-sources:${tenantId}:all`);

    return {
      success: true,
      data: { id: collectionId },
    };
  }

  // ============================================
  // Sources CRUD
  // ============================================

  /**
   * Obtiene todas las fuentes del tenant
   * Optimizado con cache y select para reducir datos transferidos
   */
  async getSources(tenantId: string, collectionId?: string) {
    const cacheKey = `knowledge-sources:${tenantId}:${collectionId || 'all'}`;
    
    // Verificar cache (1 minuto - las fuentes cambian más frecuentemente)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const where: { tenantId: string; collectionId?: string } = { tenantId };
    if (collectionId) {
      where.collectionId = collectionId;
    }

    // Query optimizada: usar select y _count en lugar de include para reducir datos
    const sources = await this.prisma.knowledgesource.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        language: true,
        content: true,
        url: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        collectionId: true,
        knowledgecollection: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            knowledgechunk: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mapear resultado para mantener compatibilidad con frontend
    const result = {
      success: true,
      data: sources.map((src) => ({
        ...src,
        knowledgechunk: [], // Frontend puede calcular count desde _count
      })),
    };

    // Guardar en cache (1 minuto)
    this.cache.set(cacheKey, result, 60 * 1000);
    
    return result;
  }

  /**
   * Obtiene una fuente específica por ID
   */
  async getSourceById(tenantId: string, sourceId: string) {
        const source = await this.prisma.knowledgesource.findFirst({
      where: {
        id: sourceId,
        tenantId,
      },
      include: {
        knowledgecollection: true,
        knowledgechunk: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!source) {
      throw new NotFoundException({
        success: false,
        error_key: 'knowledge.source_not_found',
      });
    }

    return {
      success: true,
      data: source,
    };
  }

  /**
   * Crea una nueva fuente
   */
  async createSource(tenantId: string, dto: CreateSourceDto) {
    // Validar collectionId si se proporciona
    if (dto.collectionId) {
            const collection = await this.prisma.knowledgecollection.findFirst({
        where: {
          id: dto.collectionId,
          tenantId,
        },
      });

      if (!collection) {
        throw new NotFoundException({
          success: false,
          error_key: 'knowledge.collection_not_found',
        });
      }
    }

        const source = await this.prisma.knowledgesource.create({
      data: createData({
        tenantId,
        collectionId: dto.collectionId || null,
        type: dto.type,
        title: dto.title,
        language: dto.language,
        content: dto.content || null,
        url: dto.url || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      }),
    });

    // Invalidar cache de fuentes y colecciones
    this.cache.delete(`knowledge-sources:${tenantId}:all`);
    if (dto.collectionId) {
      this.cache.delete(`knowledge-sources:${tenantId}:${dto.collectionId}`);
    }
    this.cache.delete(`knowledge-collections:${tenantId}`);

    return {
      success: true,
      data: source,
    };
  }

  /**
   * Actualiza una fuente
   */
  async updateSource(tenantId: string, sourceId: string, dto: UpdateSourceDto) {
        const source = await this.prisma.knowledgesource.findFirst({
      where: {
        id: sourceId,
        tenantId,
      },
    });

    if (!source) {
      throw new NotFoundException({
        success: false,
        error_key: 'knowledge.source_not_found',
      });
    }

    // Validar collectionId si se proporciona
    if (dto.collectionId) {
            const collection = await this.prisma.knowledgecollection.findFirst({
        where: {
          id: dto.collectionId,
          tenantId,
        },
      });

      if (!collection) {
        throw new NotFoundException({
          success: false,
          error_key: 'knowledge.collection_not_found',
        });
      }
    }

        const updated = await this.prisma.knowledgesource.update({
      where: { id: sourceId },
      data: {
        collectionId: dto.collectionId !== undefined ? dto.collectionId : source.collectionId,
        type: dto.type,
        title: dto.title,
        language: dto.language,
        content: dto.content,
        url: dto.url,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
      },
    });

    // Invalidar cache de fuentes y colecciones
    this.cache.delete(`knowledge-sources:${tenantId}:all`);
    if (source.collectionId) {
      this.cache.delete(`knowledge-sources:${tenantId}:${source.collectionId}`);
    }
    if (updated.collectionId && updated.collectionId !== source.collectionId) {
      this.cache.delete(`knowledge-sources:${tenantId}:${updated.collectionId}`);
    }
    this.cache.delete(`knowledge-collections:${tenantId}`);

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Elimina una fuente
   */
  async deleteSource(tenantId: string, sourceId: string) {
        const source = await this.prisma.knowledgesource.findFirst({
      where: {
        id: sourceId,
        tenantId,
      },
    });

    if (!source) {
      throw new NotFoundException({
        success: false,
        error_key: 'knowledge.source_not_found',
      });
    }

        await this.prisma.knowledgesource.delete({
      where: { id: sourceId },
    });

    // Invalidar cache de fuentes y colecciones
    this.cache.delete(`knowledge-sources:${tenantId}:all`);
    if (source.collectionId) {
      this.cache.delete(`knowledge-sources:${tenantId}:${source.collectionId}`);
    }
    this.cache.delete(`knowledge-collections:${tenantId}`);

    return {
      success: true,
      data: { id: sourceId },
    };
  }

  // ============================================
  // Import Methods (Preparación básica)
  // ============================================

  /**
   * Importa un documento
   * 
   * Descarga el documento desde la URL y lo procesa.
   */
  async importDocument(tenantId: string, dto: ImportDocumentDto) {
    try {
      // 1. Crear el source
            const source = await this.prisma.knowledgesource.create({
        data: createData({
          tenantId,
          collectionId: dto.collectionId || null,
          type: $Enums.knowledgesource_type.DOC,
          title: dto.title,
          language: dto.language,
          url: dto.documentUrl,
          metadata: JSON.stringify({
            ...dto.metadata,
            importStatus: 'PENDING',
            importType: 'DOCUMENT',
          }),
        }),
      });

      this.logger.log(`Document import created: ${source.id}, downloading from ${dto.documentUrl}`);

      // 2. Descargar el documento
      let fileBuffer: Buffer;
      let mimeType: string;

      try {
        const response = await axios.get(dto.documentUrl, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 segundos
        });

        fileBuffer = Buffer.from(response.data);
        mimeType = response.headers['content-type'] || 'application/octet-stream';

        // Detectar tipo MIME por extensión si no está en headers
        if (mimeType === 'application/octet-stream') {
          const urlLower = dto.documentUrl.toLowerCase();
          if (urlLower.endsWith('.pdf')) {
            mimeType = 'application/pdf';
          } else if (urlLower.endsWith('.docx')) {
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else if (urlLower.endsWith('.txt')) {
            mimeType = 'text/plain';
          }
        }
      } catch (downloadError) {
        this.logger.error(`Error downloading document: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
        throw new BadRequestException({
          success: false,
          error_key: 'document.download_failed',
          message: 'Failed to download document from URL',
        });
      }

      // 3. Procesar el documento (asíncrono, no bloquea la respuesta)
      this.processDocumentAsync(source.id, tenantId, fileBuffer, mimeType).catch((error) => {
        this.logger.error(`Error processing document asynchronously: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });

      return {
        success: true,
        data: {
          ...source,
          message: 'Document import queued. Processing in background.',
        },
      };
    } catch (error) {
      this.logger.error(`Error importing document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Procesa un documento de forma asíncrona
   */
  private async processDocumentAsync(
    sourceId: string,
    tenantId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    try {
      await this.documentProcessor.processDocument(sourceId, tenantId, fileBuffer, mimeType);
      this.logger.log(`Document ${sourceId} processed successfully`);
    } catch (error) {
      this.logger.error(`Error processing document ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Procesa un documento pendiente manualmente
   */
  async processPendingDocument(sourceId: string, tenantId: string): Promise<{
    success: boolean;
    chunksCreated: number;
    language?: string;
  }> {
        const source = await this.prisma.knowledgesource.findFirst({
      where: {
        id: sourceId,
        tenantId,
      },
    });

    if (!source) {
      throw new NotFoundException({
        success: false,
        error_key: 'knowledge.source_not_found',
      });
    }

    if (!source.url) {
      throw new BadRequestException({
        success: false,
        error_key: 'document.no_url',
        message: 'Source has no URL to download',
      });
    }

    // Descargar y procesar
    try {
      const response = await axios.get(source.url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const fileBuffer = Buffer.from(response.data);
      let mimeType = response.headers['content-type'] || 'application/octet-stream';

      // Detectar tipo MIME por extensión
      if (mimeType === 'application/octet-stream') {
        const urlLower = source.url.toLowerCase();
        if (urlLower.endsWith('.pdf')) {
          mimeType = 'application/pdf';
        } else if (urlLower.endsWith('.docx')) {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (urlLower.endsWith('.txt')) {
          mimeType = 'text/plain';
        }
      }

      return await this.documentProcessor.processDocument(sourceId, tenantId, fileBuffer, mimeType);
    } catch (error) {
      this.logger.error(`Error processing pending document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Importa contenido desde una URL
   * 
   * Por ahora solo crea el source con la URL.
   * El scraping real se implementará en PRD-16.
   */
  async importUrl(tenantId: string, dto: ImportUrlDto) {
        const source = await this.prisma.knowledgesource.create({
      data: createData({
        tenantId,
        collectionId: dto.collectionId || null,
        type: $Enums.knowledgesource_type.URL_SCRAPE,
        title: dto.title,
        language: dto.language,
        url: dto.url,
        metadata: JSON.stringify({
          ...dto.metadata,
          importStatus: 'PENDING',
          importType: 'URL_SCRAPE',
        }),
      }),
    });

    this.logger.log(`URL import created: ${source.id} (scraping will be done in PRD-16)`);

    return {
      success: true,
      data: {
        ...source,
        message: 'URL import queued. Scraping will be done in PRD-16.',
      },
    };
  }
}

