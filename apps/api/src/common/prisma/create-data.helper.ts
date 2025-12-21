import { randomUUID } from 'crypto';

/**
 * Helper para garantizar que los campos obligatorios (id, updatedAt)
 * siempre se incluyan en operaciones create de Prisma.
 * 
 * Este helper previene errores comunes donde se olvidan estos campos
 * requeridos en el schema de Prisma.
 * 
 * @param data - Datos para la operación create
 * @returns Datos con id y updatedAt garantizados
 * 
 * @example
 * ```typescript
 * const user = await prisma.user.create({
 *   data: createData({
 *     email: 'test@example.com',
 *     name: 'Test User',
 *   }),
 * });
 * ```
 */
export function createData<T extends Record<string, any>>(
  data: T,
): T & { id: string; updatedAt: Date } {
  return {
    id: data.id || randomUUID(),
    ...data,
    updatedAt: data.updatedAt || new Date(),
  };
}

/**
 * Helper específico para transacciones de Prisma.
 * Útil cuando se usa dentro de $transaction.
 * 
 * @param data - Datos para la operación create
 * @returns Datos con id y updatedAt garantizados
 * 
 * @example
 * ```typescript
 * const result = await prisma.$transaction(async (tx) => {
 *   const user = await tx.user.create({
 *     data: createDataInTransaction({
 *       email: 'test@example.com',
 *       name: 'Test User',
 *     }),
 *   });
 *   return user;
 * });
 * ```
 */
export function createDataInTransaction<T extends Record<string, any>>(
  data: T,
): T & { id: string; updatedAt: Date } {
  return createData(data);
}

/**
 * Type helper para inferir el tipo de datos de create.
 * Útil para mantener type-safety.
 */
export type CreateDataInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  updatedAt?: Date;
};


