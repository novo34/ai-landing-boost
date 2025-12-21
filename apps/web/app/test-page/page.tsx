// PÁGINA DE PRUEBA ESTÁTICA - PASO 1 DEL DIAGNÓSTICO
// Esta página NO hace fetch, NO usa hooks, NO tiene layout complejo, NO tiene middleware
// Si esta página es lenta, el problema es Next.js / Node
// Si esta página es rápida, el problema es backend / DB / fetch

export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', minHeight: '100vh' }}>
      <h1>TEST</h1>
      <p>Si esto tarda, el problema es Next</p>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        Esta es una página completamente estática sin dependencias.
      </p>
      <p style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        ✅ Si ves este mensaje, Next.js está funcionando correctamente.
      </p>
    </div>
  )
}


