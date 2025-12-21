import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import { detect } from 'langdetect';
import OpenAI from 'openai';
import { chunkText, TextChunk } from '../utils/chunking.util';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private openai: OpenAI | null = null;

  constructor(private prisma: PrismaService) {
    // Inicializar OpenAI si hay API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('⚠️ OPENAI_API_KEY not configured. Embeddings will be disabled.');
    }
  }

  /**
   * Extrae texto de un archivo según su tipo MIME
   */
  async extractText(file: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        return await this.extractTextFromPDF(file);
      } else if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        return await this.extractTextFromDOCX(file);
      } else if (mimeType === 'text/plain') {
        return file.toString('utf-8');
      } else {
        throw new BadRequestException({
          success: false,
          error_key: 'document.unsupported_format',
          message: `Unsupported file type: ${mimeType}`,
        });
      }
    } catch (error) {
      this.logger.error(`Error extracting text: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'document.extraction_failed',
        message: 'Failed to extract text from document',
      });
    }
  }

  /**
   * Extrae texto de un PDF
   */
  private async extractTextFromPDF(file: Buffer): Promise<string> {
    try {
      const data = await pdfParse(file);
      return data.text;
    } catch (error) {
      this.logger.error(`Error parsing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Extrae texto de un DOCX
   */
  private async extractTextFromDOCX(file: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: file });
      return result.value;
    } catch (error) {
      this.logger.error(`Error parsing DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Detecta el idioma de un texto y lo mapea a códigos estándar
   * 
   * Soporta: es, en, de, fr, it, pt, nl, ru, ja, ko, zh, ar, hi, tr, pl, sv, da, no, fi, cs, hu, ro, bg, hr, sk, sl, el, et, lv, lt, mt
   */
  detectLanguage(text: string): string {
    try {
      if (!text || text.trim().length === 0) {
        return 'es'; // Default a español
      }

      // Usar una muestra del texto para detectar idioma (más rápido)
      const sample = text.slice(0, 1000);
      const detected = detect(sample);

      if (detected && detected.length > 0) {
        const langCode = detected[0].lang || 'unknown';
        // Mapear códigos de langdetect a códigos estándar ISO 639-1
        return this.mapLanguageCode(langCode);
      }

      return 'es'; // Default a español
    } catch (error) {
      this.logger.warn(`Error detecting language: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 'es'; // Default a español
    }
  }

  /**
   * Mapea códigos de langdetect a códigos estándar ISO 639-1
   */
  private mapLanguageCode(langCode: string): string {
    const languageMap: Record<string, string> = {
      // Idiomas principales
      'es': 'es', // Español
      'en': 'en', // Inglés
      'de': 'de', // Alemán
      'fr': 'fr', // Francés
      'it': 'it', // Italiano
      'pt': 'pt', // Portugués
      'nl': 'nl', // Holandés
      'ru': 'ru', // Ruso
      'ja': 'ja', // Japonés
      'ko': 'ko', // Coreano
      'zh-cn': 'zh', // Chino simplificado
      'zh-tw': 'zh', // Chino tradicional
      'ar': 'ar', // Árabe
      'hi': 'hi', // Hindi
      'tr': 'tr', // Turco
      'pl': 'pl', // Polaco
      'sv': 'sv', // Sueco
      'da': 'da', // Danés
      'no': 'no', // Noruego
      'fi': 'fi', // Finlandés
      'cs': 'cs', // Checo
      'hu': 'hu', // Húngaro
      'ro': 'ro', // Rumano
      'bg': 'bg', // Búlgaro
      'hr': 'hr', // Croata
      'sk': 'sk', // Eslovaco
      'sl': 'sl', // Esloveno
      'el': 'el', // Griego
      'et': 'et', // Estonio
      'lv': 'lv', // Letón
      'lt': 'lt', // Lituano
      'mt': 'mt', // Maltés
    };

    // Normalizar código (lowercase, sin guiones)
    const normalized = langCode.toLowerCase().replace(/-/g, '');
    
    // Buscar mapeo directo
    if (languageMap[normalized]) {
      return languageMap[normalized];
    }

    // Buscar por prefijo (ej: 'zh-cn' -> 'zh')
    for (const [key, value] of Object.entries(languageMap)) {
      if (normalized.startsWith(key) || key.startsWith(normalized)) {
        return value;
      }
    }

    // Si no se encuentra, intentar usar el código directamente si es válido
    if (normalized.length === 2 && /^[a-z]{2}$/.test(normalized)) {
      return normalized;
    }

    // Default a español
    return 'es';
  }

  /**
   * Genera embeddings para un array de chunks de texto
   */
  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new BadRequestException({
        success: false,
        error_key: 'embeddings.openai_not_configured',
        message: 'OpenAI API key not configured',
      });
    }

    if (chunks.length === 0) {
      return [];
    }

    try {
      const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

      // OpenAI permite hasta 2048 textos por request, pero procesamos en lotes más pequeños
      const batchSize = 100;
      const embeddings: number[][] = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        const response = await this.openai.embeddings.create({
          model,
          input: batch,
        });

        const batchEmbeddings = response.data.map((item) => item.embedding);
        embeddings.push(...batchEmbeddings);

        this.logger.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}`);
      }

      return embeddings;
    } catch (error) {
      this.logger.error(`Error generating embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'embeddings.generation_failed',
        message: 'Failed to generate embeddings',
      });
    }
  }

  /**
   * Procesa un documento completo: extrae texto, chunking, embeddings y guarda en DB
   */
  async processDocument(
    sourceId: string,
    tenantId: string,
    file: Buffer,
    mimeType: string,
  ): Promise<{
    success: boolean;
    chunksCreated: number;
    language?: string;
  }> {
    try {
      this.logger.log(`Processing document for source ${sourceId}`);

      // 1. Extraer texto
      const text = await this.extractText(file, mimeType);
      if (!text || text.trim().length === 0) {
        throw new BadRequestException({
          success: false,
          error_key: 'document.empty_text',
          message: 'Document contains no extractable text',
        });
      }

      // 2. Detectar idioma
      const detectedLanguage = this.detectLanguage(text);
      this.logger.log(`Detected language: ${detectedLanguage}`);

      // 3. Validar que el source pertenece al tenant y actualizar con el contenido extraído
      // CRÍTICO: Validar tenantId para prevenir acceso cross-tenant
      const existingSource = await this.prisma.knowledgesource.findFirst({
        where: {
          id: sourceId,
          knowledgecollection: {
            tenantId, // OBLIGATORIO - Previene acceso cross-tenant
          },
        },
      });

      if (!existingSource) {
        throw new NotFoundException({
          success: false,
          error_key: 'knowledge.source_not_found',
          message: 'Source not found or does not belong to tenant',
        });
      }

      const existingMetadata = existingSource?.metadata ? (JSON.parse(existingSource.metadata) as unknown as Record<string, unknown>) : {};
      
      await this.prisma.knowledgesource.update({
        where: { id: sourceId },
        data: {
          content: text,
          language: detectedLanguage !== 'unknown' ? detectedLanguage : undefined,
          metadata: JSON.stringify({
            ...existingMetadata,
            importStatus: 'PROCESSING',
            processedAt: new Date().toISOString(),
          }),
        },
      });

      // 4. Chunking
      const textChunks = chunkText(text, {
        maxChunkSize: 1000,
        chunkOverlap: 200,
        splitByParagraphs: true,
      });

      if (textChunks.length === 0) {
        throw new BadRequestException({
          success: false,
          error_key: 'document.chunking_failed',
          message: 'Failed to create chunks from document',
        });
      }

      this.logger.log(`Created ${textChunks.length} chunks`);

      // 5. Generar embeddings
      let embeddings: number[][] = [];
      if (this.openai) {
        const chunkTexts = textChunks.map((chunk) => chunk.text);
        embeddings = await this.generateEmbeddings(chunkTexts);
        this.logger.log(`Generated ${embeddings.length} embeddings`);
      } else {
        this.logger.warn('Skipping embeddings generation (OpenAI not configured)');
      }

      // 6. Guardar chunks en DB
            await this.prisma.knowledgechunk.createMany({
        data: textChunks.map((chunk, index) => ({
          id: randomUUID(),
          sourceId,
          tenantId,
          content: chunk.text,
          chunkIndex: chunk.index,
          embedding: embeddings[index] ? JSON.stringify(embeddings[index]) : null,
          metadata: JSON.stringify({
            startChar: chunk.startChar,
            endChar: chunk.endChar,
          }),
          updatedAt: new Date(),
        })),
      });

      // 7. Actualizar source como procesado
      const sourceForUpdate = await this.prisma.knowledgesource.findUnique({ where: { id: sourceId } });
      const currentMetadata = sourceForUpdate?.metadata ? (JSON.parse(sourceForUpdate.metadata) as unknown as Record<string, unknown>) : {};
      
      await this.prisma.knowledgesource.update({
        where: { id: sourceId },
        data: {
          metadata: JSON.stringify({
            ...currentMetadata,
            importStatus: 'COMPLETED',
            chunksCount: textChunks.length,
            completedAt: new Date().toISOString(),
          }),
        },
      });

      this.logger.log(`Document processing completed for source ${sourceId}`);

      return {
        success: true,
        chunksCreated: textChunks.length,
        language: detectedLanguage !== 'unknown' ? detectedLanguage : undefined,
      };
    } catch (error) {
      this.logger.error(`Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Marcar source como error
      try {
        const sourceForError = await this.prisma.knowledgesource.findUnique({ where: { id: sourceId } });
        const errorMetadata = sourceForError?.metadata ? (JSON.parse(sourceForError.metadata) as unknown as Record<string, unknown>) : {};
        
        await this.prisma.knowledgesource.update({
          where: { id: sourceId },
          data: {
            metadata: JSON.stringify({
              ...errorMetadata,
              importStatus: 'ERROR',
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        });
      } catch (updateError) {
        this.logger.error(`Failed to update source error status: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
      }

      throw error;
    }
  }
}

