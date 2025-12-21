import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import OpenAI from 'openai';
import { cosineSimilarity } from '../utils/similarity.util';

export interface SearchOptions {
  language?: string;
  collectionId?: string;
  limit?: number;
}

export interface SearchResult {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  collectionId?: string;
  collectionName?: string;
  content: string;
  similarity: number;
  chunkIndex: number;
  language?: string;
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);
  private openai: OpenAI | null = null;

  constructor(private prisma: PrismaService) {
    // Inicializar OpenAI si hay API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
      this.logger.log('OpenAI client initialized for semantic search');
    } else {
      this.logger.warn('⚠️ OPENAI_API_KEY not configured. Semantic search will be disabled.');
    }
  }

  /**
   * Realiza una búsqueda semántica en la base de conocimiento
   */
  async search(
    tenantId: string,
    query: string,
    options: SearchOptions = {},
  ): Promise<{
    success: boolean;
    results: SearchResult[];
    totalResults: number;
  }> {
    if (!this.openai) {
      throw new BadRequestException({
        success: false,
        error_key: 'search.openai_not_configured',
        message: 'OpenAI API key not configured. Semantic search is disabled.',
      });
    }

    if (!query || query.trim().length === 0) {
      throw new BadRequestException({
        success: false,
        error_key: 'search.empty_query',
        message: 'Query cannot be empty',
      });
    }

    const { language, collectionId, limit = 10 } = options;

    try {
      // 1. Generar embedding de la query
      const queryEmbedding = await this.generateQueryEmbedding(query);
      this.logger.log(`Generated query embedding (dimension: ${queryEmbedding.length})`);

      // 2. Obtener chunks del tenant con embeddings
      // Construir where clause para Prisma
      const prismaWhere: {
        tenantId: string;
        embedding: { not: null };
        sourceId?: string;
        source?: { language?: string; collectionId?: string };
      } = {
        tenantId,
        embedding: { not: null },
      };

      // Filtrar por colección si se especifica
      if (collectionId) {
        prismaWhere.source = {
          ...prismaWhere.source,
          collectionId,
        };
      }

      // Filtrar por idioma si se especifica
      if (language) {
        prismaWhere.source = {
          ...prismaWhere.source,
          language,
        };
      }

      // Optimización: Limitar chunks consultados para mejorar performance
      // Consultamos hasta 200 chunks (suficiente para calcular similitud y ordenar)
      // Luego limitamos a los top N resultados finales
      const MAX_CHUNKS_TO_QUERY = 200;
      
      const chunks = await this.prisma.knowledgechunk.findMany({
        where: prismaWhere,
        take: MAX_CHUNKS_TO_QUERY, // Limitar chunks consultados
        select: {
          id: true,
          sourceId: true,
          content: true,
          chunkIndex: true,
          embedding: true,
          knowledgesource: {
            select: {
              title: true,
              collectionId: true,
              language: true,
              knowledgecollection: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (chunks.length === 0) {
        return {
          success: true,
          results: [],
          totalResults: 0,
        };
      }

      this.logger.log(`Found ${chunks.length} chunks with embeddings`);

      // 3. Calcular similitud coseno para cada chunk
      const resultsWithSimilarity = chunks
        .map((chunk) => {
          // embedding es string (JSON) en Prisma, necesitamos parsearlo
          const chunkEmbedding = chunk.embedding ? (JSON.parse(chunk.embedding) as number[]) : null;
          if (!chunkEmbedding) {
            return null;
          }
          const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

          return {
            chunkId: chunk.id,
            sourceId: chunk.sourceId,
            sourceTitle: chunk.knowledgesource.title,
            collectionId: chunk.knowledgesource.collectionId || undefined,
            collectionName: chunk.knowledgesource.knowledgecollection?.name || undefined,
            content: chunk.content,
            similarity,
            chunkIndex: chunk.chunkIndex,
            language: chunk.knowledgesource.language,
          };
        })
        .filter((result): result is NonNullable<typeof result> => result !== null)
        .filter((result) => result.similarity > 0) // Filtrar resultados con similitud negativa
        .sort((a, b) => b.similarity - a.similarity) // Ordenar por similitud descendente
        .slice(0, limit); // Limitar resultados

      this.logger.log(`Returning ${resultsWithSimilarity.length} results`);

      return {
        success: true,
        results: resultsWithSimilarity,
        totalResults: resultsWithSimilarity.length,
      };
    } catch (error) {
      this.logger.error(`Error performing semantic search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'search.failed',
        message: 'Failed to perform semantic search',
      });
    }
  }

  /**
   * Genera un embedding para la query de búsqueda
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!this.openai) {
      throw new BadRequestException({
        success: false,
        error_key: 'embeddings.openai_not_configured',
        message: 'OpenAI API key not configured',
      });
    }

    try {
      const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

      const response = await this.openai.embeddings.create({
        model,
        input: query,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Error generating query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'embeddings.generation_failed',
        message: 'Failed to generate query embedding',
      });
    }
  }

  /**
   * Verifica si hay embeddings disponibles para el tenant
   */
  async hasEmbeddings(tenantId: string): Promise<boolean> {
    try {
            const count = await this.prisma.knowledgechunk.count({
        where: {
          tenantId,
          embedding: { not: null },
        },
      });

      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}

