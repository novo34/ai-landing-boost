/**
 * Utilidades para cálculo de similitud entre vectores
 */

/**
 * Calcula la similitud coseno entre dos vectores
 * 
 * Fórmula: cos(θ) = (A · B) / (||A|| * ||B||)
 * 
 * @param vector1 Primer vector
 * @param vector2 Segundo vector
 * @returns Similitud coseno (valor entre -1 y 1, donde 1 es idéntico)
 */
export function cosineSimilarity(
  vector1: number[],
  vector2: number[],
): number {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length');
  }

  if (vector1.length === 0) {
    return 0;
  }

  // Calcular producto punto
  let dotProduct = 0;
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
  }

  // Calcular magnitudes
  let magnitude1 = 0;
  let magnitude2 = 0;
  for (let i = 0; i < vector1.length; i++) {
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  // Evitar división por cero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calcula la distancia euclidiana entre dos vectores
 * 
 * @param vector1 Primer vector
 * @param vector2 Segundo vector
 * @returns Distancia euclidiana
 */
export function euclideanDistance(
  vector1: number[],
  vector2: number[],
): number {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length');
  }

  if (vector1.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < vector1.length; i++) {
    const diff = vector1[i] - vector2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

