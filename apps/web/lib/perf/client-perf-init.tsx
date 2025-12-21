/**
 * Componente para inicializar instrumentación de rendimiento en el cliente
 * Se ejecuta una vez al cargar la app
 */

'use client';

import { useEffect } from 'react';
import { initLongTaskObserver } from './client-perf';

export function ClientPerfInit() {
  useEffect(() => {
    initLongTaskObserver();
  }, []);

  return null;
}
