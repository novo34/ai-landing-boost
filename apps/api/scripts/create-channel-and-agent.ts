/**
 * Script para crear un canal y un agente de WhatsApp
 * 
 * Uso:
 *   ts-node apps/api/scripts/create-channel-and-agent.ts
 * 
 * O con npm:
 *   npm run script:create-channel-agent
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const EMAIL = process.env.TEST_EMAIL || 'klever@admin.com';
const PASSWORD = process.env.TEST_PASSWORD || 'password123';

interface LoginResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    name?: string;
  };
}

interface WhatsAppAccount {
  id: string;
  provider: string;
  phoneNumber: string;
  status: string;
  displayName?: string;
  instanceName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error_key?: string;
  message?: string;
}

async function login(): Promise<string> {
  console.log('🔐 Iniciando sesión...');
  
  const response = await axios.post<LoginResponse>(
    `${API_URL}/auth/login`,
    {
      email: EMAIL,
      password: PASSWORD,
    },
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.data.success) {
    throw new Error('Login fallido');
  }

  console.log('✅ Login exitoso');
  
  // Obtener el token de las cookies
  const cookies = response.headers['set-cookie'];
  if (!cookies) {
    throw new Error('No se recibieron cookies de autenticación');
  }

  // Extraer el access_token de las cookies
  const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='));
  if (!accessTokenCookie) {
    throw new Error('No se encontró access_token en las cookies');
  }

  // El token está en formato cookie, necesitamos extraerlo
  // Por ahora, vamos a usar las cookies directamente en las siguientes peticiones
  return accessTokenCookie.split('=')[1].split(';')[0];
}

async function getWhatsAppAccounts(cookies: string[]): Promise<WhatsAppAccount[]> {
  console.log('📱 Obteniendo cuentas de WhatsApp...');
  
  const response = await axios.get<ApiResponse<WhatsAppAccount[]>>(
    `${API_URL}/whatsapp/accounts`,
    {
      withCredentials: true,
      headers: {
        Cookie: cookies.join('; '),
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('No se pudieron obtener las cuentas de WhatsApp');
  }

  console.log(`✅ Encontradas ${response.data.data.length} cuenta(s) de WhatsApp`);
  return response.data.data;
}

async function createChannel(cookies: string[], accountId: string): Promise<string> {
  console.log('📢 Creando canal de WhatsApp...');
  
  const response = await axios.post<ApiResponse<{ id: string }>>(
    `${API_URL}/channels`,
    {
      type: 'WHATSAPP',
      name: 'Canal WhatsApp PRUEBA1',
      status: 'ACTIVE',
      config: {
        whatsappAccountId: accountId,
      },
    },
    {
      withCredentials: true,
      headers: {
        Cookie: cookies.join('; '),
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(`Error al crear canal: ${response.data.message || response.data.error_key}`);
  }

  console.log(`✅ Canal creado: ${response.data.data.id}`);
  return response.data.data.id;
}

async function createAgent(cookies: string[], whatsappAccountId: string): Promise<string> {
  console.log('🤖 Creando agente de WhatsApp...');
  
  const response = await axios.post<ApiResponse<{ id: string }>>(
    `${API_URL}/agents`,
    {
      name: 'Agente WhatsApp PRUEBA1',
      whatsappAccountId: whatsappAccountId,
      status: 'ACTIVE',
      languageStrategy: 'AUTO_DETECT',
    },
    {
      withCredentials: true,
      headers: {
        Cookie: cookies.join('; '),
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(`Error al crear agente: ${response.data.message || response.data.error_key}`);
  }

  console.log(`✅ Agente creado: ${response.data.data.id}`);
  return response.data.data.id;
}

async function main() {
  try {
    console.log('🚀 Iniciando creación de canal y agente...\n');

    // 1. Login
    const loginResponse = await axios.post<LoginResponse>(
      `${API_URL}/auth/login`,
      {
        email: EMAIL,
        password: PASSWORD,
      },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!loginResponse.data.success) {
      throw new Error('Login fallido');
    }

    console.log('✅ Login exitoso\n');

    // Obtener cookies
    const cookies = loginResponse.headers['set-cookie'] || [];
    if (cookies.length === 0) {
      throw new Error('No se recibieron cookies de autenticación');
    }

    // 2. Obtener cuentas de WhatsApp
    const accounts = await getWhatsAppAccounts(cookies);
    
    if (accounts.length === 0) {
      throw new Error('No se encontraron cuentas de WhatsApp. Primero crea una cuenta en Configuración → WhatsApp');
    }

    const account = accounts[0];
    console.log(`📱 Usando cuenta: ${account.displayName || account.instanceName || account.phoneNumber} (${account.id})\n`);

    // 3. Crear canal
    const channelId = await createChannel(cookies, account.id);
    console.log(`📢 Canal ID: ${channelId}\n`);

    // 4. Crear agente
    const agentId = await createAgent(cookies, account.id);
    console.log(`🤖 Agente ID: ${agentId}\n`);

    console.log('✅ ¡Proceso completado exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - Cuenta WhatsApp: ${account.displayName || account.instanceName || account.phoneNumber}`);
    console.log(`   - Canal ID: ${channelId}`);
    console.log(`   - Agente ID: ${agentId}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
