'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dashboard de solo lectura para VIEWER
 * Por ahora redirige a /app hasta que se implemente el dashboard específico
 */
export default function ViewerDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir al dashboard principal por ahora
    router.replace('/app');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirigiendo...</p>
    </div>
  );
}
