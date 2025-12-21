// Usar fetch nativo de Node.js 18+ (no requiere node-fetch)
const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testLoginEndpoint() {
  console.log('🧪 Probando endpoint de login...\n');
  console.log(`URL: ${API_URL}/auth/login\n`);

  // Usar variables de entorno para credenciales de prueba
  // Ejemplo: TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword npm run test:endpoint
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    console.error('❌ Error: TEST_EMAIL y TEST_PASSWORD deben estar configurados como variables de entorno');
    console.error('   Ejemplo: TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword npm run test:endpoint');
    return;
  }

  const testCases = [
    {
      email: testEmail,
      password: testPassword,
      name: 'Test User',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📧 Probando login para: ${testCase.email}`);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password,
        }),
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        
        if (data.success) {
          console.log(`   ✅ Login exitoso para ${testCase.email}`);
        } else {
          console.log(`   ❌ Login falló: ${data.error_key || 'Unknown error'}`);
        }
      } else {
        const text = await response.text();
        console.log(`   Response (text): ${text.substring(0, 200)}`);
      }

      // Verificar cookies
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        console.log(`   Cookies recibidas: ${cookies ? '✅' : '❌'}`);
        const cookieArray = cookies.split(',').map(c => c.trim());
        cookieArray.forEach(cookie => {
          const name = cookie.split('=')[0];
          console.log(`     - ${name}`);
        });
      } else {
        console.log(`   ⚠️ No se recibieron cookies`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error al hacer petición:`, error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error(`   ❌ El servidor no está corriendo en ${API_URL}`);
        console.error(`   💡 Asegúrate de que el backend esté iniciado con: npm run start:dev`);
      }
    }
  }

  // Probar también con credenciales incorrectas
  console.log(`\n\n🧪 Probando con credenciales incorrectas...`);
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail || 'test@example.com',
        password: 'password_incorrecta',
      }),
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (!data.success && data.error_key === 'auth.invalid_credentials') {
      console.log(`   ✅ El endpoint está validando correctamente credenciales incorrectas`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
  }
}

testLoginEndpoint()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

