/**
 * Script para crear un canal y un agente de WhatsApp directamente usando Prisma
 * Esto evita problemas de autenticación y guards
 *
 * Uso:
 *   node apps/api/scripts/create-channel-and-agent-direct.js
 */

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🚀 Iniciando creación de canal y agente (modo directo)...\n");

    // 1. Buscar el tenant "AI Landing Boost" (usando el ID que vimos antes)
    console.log("📋 Buscando tenant...");
    // Usar el tenantId que vimos en el script anterior
    const tenantId = "cmj018os20000eq9yiwz99piy";
    const tenant = await prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    });

    if (!tenant) {
      throw new Error("No se encontró el tenant 'AI Landing Boost'");
    }

    console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.id})\n`);

    // 2. Obtener cuenta de WhatsApp
    console.log("📱 Obteniendo cuentas de WhatsApp...");
    const whatsappAccount = await prisma.tenantwhatsappaccount.findFirst({
      where: {
        tenantId: tenant.id,
        status: "CONNECTED",
      },
    });

    if (!whatsappAccount) {
      throw new Error(
        "No se encontró ninguna cuenta de WhatsApp conectada para este tenant"
      );
    }

    console.log(
      `✅ Cuenta encontrada: ${whatsappAccount.displayName || whatsappAccount.instanceName || whatsappAccount.phoneNumber} (${whatsappAccount.id})\n`
    );

    // 3. Verificar si ya existe un canal con este nombre
    console.log("📢 Verificando si ya existe un canal...");
    const existingChannel = await prisma.channel.findFirst({
      where: {
        tenantId: tenant.id,
        name: "Canal WhatsApp PRUEBA1",
        type: "WHATSAPP",
      },
    });

    let channel;
    if (existingChannel) {
      console.log(
        `⚠️  Ya existe un canal con este nombre: ${existingChannel.id}`
      );
      console.log("   Usando el canal existente...");
      channel = existingChannel;
    } else {
      console.log("📢 Creando nuevo canal de WhatsApp...");
      channel = await prisma.channel.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          type: "WHATSAPP",
          name: "Canal WhatsApp PRUEBA1",
          status: "ACTIVE",
          config: JSON.stringify({
            whatsappAccountId: whatsappAccount.id,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Canal creado: ${channel.id}\n`);
    }

    // 4. Verificar si ya existe un agente con este nombre
    console.log("🤖 Verificando si ya existe un agente...");
    const existingAgent = await prisma.agent.findFirst({
      where: {
        tenantId: tenant.id,
        name: "Agente WhatsApp PRUEBA1",
      },
    });

    let agent;
    if (existingAgent) {
      console.log(
        `⚠️  Ya existe un agente con este nombre: ${existingAgent.id}`
      );
      console.log("   Usando el agente existente...");
      agent = existingAgent;
    } else {
      console.log("🤖 Creando nuevo agente de WhatsApp...");
      agent = await prisma.agent.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          name: "Agente WhatsApp PRUEBA1",
          whatsappAccountId: whatsappAccount.id,
          status: "ACTIVE",
          languageStrategy: "AUTO_DETECT",
          knowledgeCollectionIds: "[]", // Array vacío como JSON string
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Agente creado: ${agent.id}\n`);
    }

    console.log("✅ ¡Proceso completado exitosamente!");
    console.log("\n📋 Resumen:");
    console.log(`   - Tenant: ${tenant.name} (${tenant.id})`);
    console.log(
      `   - Cuenta WhatsApp: ${whatsappAccount.displayName || whatsappAccount.instanceName || whatsappAccount.phoneNumber} (${whatsappAccount.id})`
    );
    console.log(`   - Canal ID: ${channel.id}`);
    console.log(`   - Agente ID: ${agent.id}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
