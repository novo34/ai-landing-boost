/**
 * Script para crear un canal y un agente de WhatsApp
 *
 * Uso:
 *   node apps/api/scripts/create-channel-and-agent.js
 */

const axios = require("axios");

const API_URL = process.env.API_URL || "http://localhost:3001";
// Credenciales del usuario - Usar variables de entorno para mayor seguridad
// Ejemplo: TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword node script.js
const CREDENTIALS = [
  {
    email: process.env.TEST_EMAIL || "test@example.com",
    password: process.env.TEST_PASSWORD || "",
  },
];

async function loginWithCredentials(email, password) {
  console.log(`🔐 Intentando login con: ${email}...`);
  const loginResponse = await axios.post(
    `${API_URL}/auth/login`,
    {
      email: email,
      password: password,
    },
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return loginResponse;
}

async function main() {
  try {
    console.log("🚀 Iniciando creación de canal y agente...\n");

    // 1. Login - intentar con diferentes credenciales
    let loginResponse;
    let loggedIn = false;

    for (const cred of CREDENTIALS) {
      try {
        loginResponse = await loginWithCredentials(cred.email, cred.password);
        if (loginResponse.data.success) {
          loggedIn = true;
          console.log(`✅ Login exitoso con: ${cred.email}\n`);
          break;
        }
      } catch (error) {
        // Continuar con el siguiente
        continue;
      }
    }

    if (!loggedIn || !loginResponse) {
      throw new Error(
        "No se pudo hacer login con ninguna de las credenciales. Por favor, verifica las credenciales en el script."
      );
    }

    // Obtener cookies
    const cookies = loginResponse.headers["set-cookie"] || [];
    if (cookies.length === 0) {
      throw new Error("No se recibieron cookies de autenticación");
    }

    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

    // Extraer el access_token de las cookies para usarlo como Authorization header
    const accessTokenCookie = cookies.find((c) =>
      c.startsWith("access_token=")
    );
    const accessToken = accessTokenCookie
      ? accessTokenCookie.split("=")[1].split(";")[0]
      : null;

    // Headers comunes para todas las peticiones
    const commonHeaders = {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    };

    // Agregar Authorization header si tenemos el token
    if (accessToken) {
      commonHeaders.Authorization = `Bearer ${accessToken}`;
    }

    // 2. Obtener sesión para verificar tenant
    console.log("📋 Obteniendo sesión...");
    const sessionResponse = await axios.get(`${API_URL}/session/me`, {
      withCredentials: true,
      headers: commonHeaders,
    });

    if (!sessionResponse.data.success || !sessionResponse.data.data) {
      throw new Error("No se pudo obtener la sesión");
    }

    const session = sessionResponse.data.data;
    console.log(
      `✅ Sesión obtenida. Tenants disponibles: ${session.tenants?.length || 0}`
    );

    // Si no hay tenant actual, usar el primero disponible
    if (
      !session.currentTenant &&
      session.tenants &&
      session.tenants.length > 0
    ) {
      const firstTenant = session.tenants[0];
      console.log(
        `📌 Usando tenant: ${firstTenant.name} (${firstTenant.tenantId})`
      );
      // Nota: En producción, necesitarías cambiar de tenant mediante el endpoint correspondiente
      // Por ahora, asumimos que el JWT ya tiene el tenant correcto después del login
    } else if (session.currentTenant) {
      console.log(
        `📌 Tenant actual: ${session.currentTenant.name} (${session.currentTenant.tenantId})`
      );
    } else {
      throw new Error(
        "No hay tenants disponibles para este usuario. Necesitas crear un tenant primero."
      );
    }

    // 3. Obtener cuentas de WhatsApp
    console.log("📱 Obteniendo cuentas de WhatsApp...");
    const accountsResponse = await axios.get(`${API_URL}/whatsapp/accounts`, {
      withCredentials: true,
      headers: commonHeaders,
    });

    if (!accountsResponse.data.success || !accountsResponse.data.data) {
      throw new Error("No se pudieron obtener las cuentas de WhatsApp");
    }

    const accounts = accountsResponse.data.data;
    console.log(`✅ Encontradas ${accounts.length} cuenta(s) de WhatsApp`);

    if (accounts.length === 0) {
      throw new Error(
        "No se encontraron cuentas de WhatsApp. Primero crea una cuenta en Configuración → WhatsApp"
      );
    }

    const account = accounts[0];
    console.log(
      `📱 Usando cuenta: ${account.displayName || account.instanceName || account.phoneNumber} (${account.id})\n`
    );

    // 4. Crear canal
    console.log("📢 Creando canal de WhatsApp...");
    const channelResponse = await axios.post(
      `${API_URL}/channels`,
      {
        type: "WHATSAPP",
        name: "Canal WhatsApp PRUEBA1",
        status: "ACTIVE",
        config: {
          whatsappAccountId: account.id,
        },
      },
      {
        withCredentials: true,
        headers: commonHeaders,
      }
    );

    if (!channelResponse.data.success || !channelResponse.data.data) {
      const errorMsg =
        channelResponse.data.message ||
        channelResponse.data.error_key ||
        "Error desconocido";
      throw new Error(`Error al crear canal: ${errorMsg}`);
    }

    const channelId = channelResponse.data.data.id;
    console.log(`✅ Canal creado: ${channelId}\n`);

    // 5. Crear agente
    console.log("🤖 Creando agente de WhatsApp...");
    const agentResponse = await axios.post(
      `${API_URL}/agents`,
      {
        name: "Agente WhatsApp PRUEBA1",
        whatsappAccountId: account.id,
        status: "ACTIVE",
        languageStrategy: "AUTO_DETECT",
      },
      {
        withCredentials: true,
        headers: commonHeaders,
      }
    );

    if (!agentResponse.data.success || !agentResponse.data.data) {
      const errorMsg =
        agentResponse.data.message ||
        agentResponse.data.error_key ||
        "Error desconocido";
      throw new Error(`Error al crear agente: ${errorMsg}`);
    }

    const agentId = agentResponse.data.data.id;
    console.log(`✅ Agente creado: ${agentId}\n`);

    console.log("✅ ¡Proceso completado exitosamente!");
    console.log("\n📋 Resumen:");
    console.log(
      `   - Cuenta WhatsApp: ${account.displayName || account.instanceName || account.phoneNumber}`
    );
    console.log(`   - Canal ID: ${channelId}`);
    console.log(`   - Agente ID: ${agentId}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error(
        "   Detalles:",
        JSON.stringify(error.response.data, null, 2)
      );
      console.error("   Status:", error.response.status);
    }
    if (error.stack) {
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();
