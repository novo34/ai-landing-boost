/**
 * Sistema de instrumentación de rendimiento
 * 
 * Logs SOLO en development (NODE_ENV !== 'production')
 * Formato consistente: [PERF][SERVER|CLIENT] <context> ... ms
 */

const isDev = process.env.NODE_ENV === 'development';

type PerfContext = 'SERVER' | 'CLIENT';

interface PerfMetric {
  label: string;
  duration: number;
  context: PerfContext;
  metadata?: Record<string, unknown>;
}

class PerfLogger {
  private metrics: PerfMetric[] = [];

  /**
   * Mide el tiempo de ejecución de una función async
   */
  async measure<T>(
    label: string,
    fn: () => Promise<T>,
    context: PerfContext = 'SERVER',
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!isDev) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.log(label, duration, context, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log(`${label} [ERROR]`, duration, context, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * Mide el tiempo de ejecución de una función sync
   */
  measureSync<T>(
    label: string,
    fn: () => T,
    context: PerfContext = 'SERVER',
    metadata?: Record<string, unknown>
  ): T {
    if (!isDev) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.log(label, duration, context, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log(`${label} [ERROR]`, duration, context, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * Crea un timer que se puede detener manualmente
   */
  startTimer(label: string, context: PerfContext = 'SERVER'): () => void {
    if (!isDev) {
      return () => {};
    }

    const start = performance.now();
    return (metadata?: Record<string, unknown>) => {
      const duration = performance.now() - start;
      this.log(label, duration, context, metadata);
    };
  }

  /**
   * Log de métrica
   */
  private log(
    label: string,
    duration: number,
    context: PerfContext,
    metadata?: Record<string, unknown>
  ): void {
    if (!isDev) return;

    const metric: PerfMetric = {
      label,
      duration,
      context,
      metadata,
    };

    this.metrics.push(metric);

    // Formato: [PERF][SERVER|CLIENT] <label> ... ms
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.log(`[PERF][${context}] ${label} ... ${duration.toFixed(2)}ms${metadataStr}`);

    // Guardar métricas para análisis posterior (últimas 100)
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Obtiene todas las métricas registradas
   */
  getMetrics(): PerfMetric[] {
    return [...this.metrics];
  }

  /**
   * Limpia las métricas
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Obtiene métricas agrupadas por label
   */
  getMetricsByLabel(): Record<string, { count: number; total: number; avg: number; min: number; max: number }> {
    const grouped: Record<string, number[]> = {};

    this.metrics.forEach(metric => {
      if (!grouped[metric.label]) {
        grouped[metric.label] = [];
      }
      grouped[metric.label].push(metric.duration);
    });

    const result: Record<string, { count: number; total: number; avg: number; min: number; max: number }> = {};

    Object.entries(grouped).forEach(([label, durations]) => {
      const total = durations.reduce((sum, d) => sum + d, 0);
      const avg = total / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      result[label] = {
        count: durations.length,
        total,
        avg,
        min,
        max,
      };
    });

    return result;
  }
}

// Singleton para uso global
export const perfLogger = new PerfLogger();

/**
 * Helper para medir en server components
 */
export async function measureServer<T>(
  label: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return perfLogger.measure(label, fn, 'SERVER', metadata);
}

/**
 * Helper para medir en client components
 */
export async function measureClient<T>(
  label: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return perfLogger.measure(label, fn, 'CLIENT', metadata);
}

/**
 * Helper para medir funciones sync
 */
export function measureSync<T>(
  label: string,
  fn: () => T,
  context: PerfContext = 'SERVER',
  metadata?: Record<string, unknown>
): T {
  return perfLogger.measureSync(label, fn, context, metadata);
}

/**
 * Helper para crear timer
 */
export function startTimer(label: string, context: PerfContext = 'SERVER'): () => void {
  return perfLogger.startTimer(label, context);
}
