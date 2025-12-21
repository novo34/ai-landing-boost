// PÁGINA DE PRUEBA ULTRA SIMPLE - Sin dependencias complejas
// Esta página usa el layout raíz pero es muy simple

export default function TestSimple() {
  return (
    <div style={{ margin: 0, padding: '2rem', fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
      <h1>TEST SIMPLE</h1>
      <p>Si esto carga, Next.js funciona</p>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        Esta página es muy simple y no tiene dependencias complejas.
      </p>
      <p style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
        ✅ Si ves este mensaje, Next.js está funcionando correctamente.
      </p>
    </div>
  );
}


