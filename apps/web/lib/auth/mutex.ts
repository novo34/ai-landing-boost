/**
 * Mutex implementation para single-flight pattern
 * Previene ejecuciones concurrentes de la misma operación
 * 
 * Uso:
 * const mutex = new Mutex();
 * await mutex.run(async () => {
 *   // Código que solo debe ejecutarse una vez a la vez
 * });
 */
export class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  /**
   * Ejecuta una función de forma exclusiva.
   * Si hay otra ejecución en curso, espera en la cola.
   * 
   * @param fn Función async a ejecutar
   * @returns Promise con el resultado de la función
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Agregar función a la cola
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          // Liberar lock y procesar siguiente en cola
          this.locked = false;
          const next = this.queue.shift();
          if (next) {
            this.locked = true;
            next();
          }
        }
      });

      // Si no está bloqueado, ejecutar inmediatamente
      if (!this.locked) {
        this.locked = true;
        const next = this.queue.shift();
        if (next) {
          next();
        }
      }
    });
  }

  /**
   * Verifica si el mutex está actualmente bloqueado
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Obtiene el número de operaciones en espera
   */
  queueLength(): number {
    return this.queue.length;
  }
}


