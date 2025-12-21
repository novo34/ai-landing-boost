/**
 * Instrumentación de rendimiento en el cliente
 * 
 * Mide:
 * - Navegación entre rutas
 * - Tiempo de hydration
 * - Long tasks (tareas que bloquean el main thread)
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { measureClient } from './perfLogger';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Hook para medir el tiempo de hydration de un componente
 */
export function useHydrationPerf(componentName: string) {
  useEffect(() => {
    if (!isDev) return;

    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      console.log(`[PERF][CLIENT] ${componentName}.hydration ... ${duration.toFixed(2)}ms`);
    };
  }, [componentName]);
}

/**
 * Hook para medir navegación entre rutas
 */
export function useNavigationPerf() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isDev) return;

    const start = performance.now();
    
    // Medir tiempo hasta que la página esté lista
    const measurePageReady = () => {
      const duration = performance.now() - start;
      console.log(`[PERF][CLIENT] navigation.to.${pathname} ... ${duration.toFixed(2)}ms`);
    };

    // Usar requestAnimationFrame para medir cuando el DOM está listo
    requestAnimationFrame(() => {
      requestAnimationFrame(measurePageReady);
    });
  }, [pathname]);
}

/**
 * Inicializa el observador de long tasks con stack traces mejorados
 */
export function initLongTaskObserver() {
  if (!isDev || typeof window === 'undefined') return;

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Capturar stack trace
            const stack = new Error().stack || 'No stack available';
            
            // Capturar información de la ruta actual
            const pathname = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
            
            // Filtrar stack trace para mostrar solo las primeras líneas relevantes
            const stackLines = stack.split('\n').slice(0, 15).join('\n');
            
            console.warn(
              `[PERF][CLIENT] Long task detected ... ${entry.duration.toFixed(2)}ms`,
              {
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
                pathname,
                stack: stackLines,
              }
            );
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Long task observer no soportado en todos los navegadores
      if (isDev) {
        console.warn('[PERF] Long task observer not supported:', error);
      }
    }
  }
}

/**
 * Mide el tiempo de una operación async en el cliente
 */
export async function measureClientOperation<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  return measureClient(label, fn);
}
