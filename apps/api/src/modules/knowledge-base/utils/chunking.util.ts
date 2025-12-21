/**
 * Utilidades para chunking de texto
 */

export interface ChunkingOptions {
  maxChunkSize?: number; // Tamaño máximo de chunk en caracteres
  chunkOverlap?: number; // Solapamiento entre chunks
  splitByParagraphs?: boolean; // Priorizar párrafos
}

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

/**
 * Divide un texto en chunks inteligentes
 * 
 * Estrategia:
 * 1. Si splitByParagraphs está activado, intenta dividir por párrafos primero
 * 2. Si un párrafo es muy grande, lo divide por tamaño
 * 3. Aplica overlap entre chunks
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {},
): TextChunk[] {
  const {
    maxChunkSize = 1000,
    chunkOverlap = 200,
    splitByParagraphs = true,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let currentIndex = 0;
  let startChar = 0;

  // Dividir por párrafos si está habilitado
  if (splitByParagraphs) {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();

      // Si el párrafo cabe en un chunk, agregarlo completo
      if (trimmedParagraph.length <= maxChunkSize) {
        chunks.push({
          text: trimmedParagraph,
          index: currentIndex++,
          startChar,
          endChar: startChar + trimmedParagraph.length,
        });
        startChar += trimmedParagraph.length + 2; // +2 para los saltos de línea
      } else {
        // Si el párrafo es muy grande, dividirlo por tamaño
        const subChunks = splitBySize(trimmedParagraph, maxChunkSize, chunkOverlap);
        for (const subChunk of subChunks) {
          chunks.push({
            text: subChunk,
            index: currentIndex++,
            startChar,
            endChar: startChar + subChunk.length,
          });
          startChar += subChunk.length;
        }
      }
    }
  } else {
    // Dividir directamente por tamaño
    const subChunks = splitBySize(text, maxChunkSize, chunkOverlap);
    for (const subChunk of subChunks) {
      chunks.push({
        text: subChunk,
        index: currentIndex++,
        startChar,
        endChar: startChar + subChunk.length,
      });
      startChar += subChunk.length;
    }
  }

  return chunks;
}

/**
 * Divide un texto por tamaño con overlap
 */
function splitBySize(
  text: string,
  maxSize: number,
  overlap: number,
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    let chunk = text.slice(start, end);

    // Intentar cortar en un punto natural (espacio, punto, etc.)
    if (end < text.length) {
      const lastSpace = chunk.lastIndexOf(' ');
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');

      const cutPoint = Math.max(lastSpace, lastPeriod, lastNewline);

      if (cutPoint > maxSize * 0.5) {
        // Solo cortar si encontramos un punto natural en la segunda mitad
        chunk = chunk.slice(0, cutPoint + 1);
        start += cutPoint + 1 - overlap;
      } else {
        start += maxSize - overlap;
      }
    } else {
      start = text.length;
    }

    chunks.push(chunk.trim());

    if (start >= text.length) {
      break;
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

