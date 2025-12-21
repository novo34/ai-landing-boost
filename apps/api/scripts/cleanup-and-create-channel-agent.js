/**
 * Script para limpiar canales y agentes duplicados y crear nuevos con UUIDs válidos
 */

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🧹 Limpiando y creando canal y agente...\n");

    const tenantId = "cmj018os20000eq9yiwz99piy";

    // 1. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error("No se encontró el tenant");
    }

    console.log(`✅ Tenant: ${tenant.name}\n`);

    // 2. Obtener cuenta WhatsApp
    const whatsappAccount = await prisma.tenantwhatsappaccount.findFirst({
      where: {
        tenantId: tenant.id,
        status: "CONNECTED",
      },
    });

    if (!whatsappAccount) {
      throw new Error("No se encontró cuenta WhatsApp conectada");
    }

    console.log(
      `✅ Cuenta WhatsApp: ${whatsappAccount.displayName || whatsappAccount.instanceName || whatsappAccount.phoneNumber}\n`
    );

    // 3. Eliminar canales duplicados con nombres similares
    console.log("🗑️  Eliminando canales duplicados...");
    const channelsToDelete = await prisma.channel.findMany({
      where: {
        tenantId: tenant.id,
        name: {
          contains: "PRUEBA1",
        },
        type: "WHATSAPP",
      },
    });

    if (channelsToDelete.length > 0) {
      await prisma.channel.deleteMany({
        where: {
          id: { in: channelsToDelete.map((c) => c.id) },
        },
      });
      console.log(`   Eliminados ${channelsToDelete.length} canal(es)\n`);
    }

    // 4. Eliminar agentes duplicados
    console.log("🗑️  Eliminando agentes duplicados...");
    const agentsToDelete = await prisma.agent.findMany({
      where: {
        tenantId: tenant.id,
        name: {
          contains: "PRUEBA1",
        },
      },
    });

    if (agentsToDelete.length > 0) {
      await prisma.agent.deleteMany({
        where: {
          id: { in: agentsToDelete.map((a) => a.id) },
        },
      });
      console.log(`   Eliminados ${agentsToDelete.length} agente(s)\n`);
    }

    // 5. Crear nuevo canal con UUID válido
    console.log("📢 Creando nuevo canal...");
    const channel = await prisma.channel.create({
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

    console.log(`✅ Canal creado: ${channel.id} (${channel.name})\n`);

    // 6. Crear nuevo agente con UUID válido
    console.log("🤖 Creando nuevo agente...");
    const agent = await prisma.agent.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: "Agente WhatsApp PRUEBA1",
        whatsappAccountId: whatsappAccount.id,
        status: "ACTIVE",
        languageStrategy: "AUTO_DETECT",
        knowledgeCollectionIds: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Agente creado: ${agent.id} (${agent.name})\n`);

    console.log("✅ ¡Proceso completado exitosamente!");
    console.log("\n📋 Resumen:");
    console.log(`   - Canal ID: ${channel.id}`);
    console.log(`   - Agente ID: ${agent.id}`);
    console.log(
      `   - Ambos están asociados a la cuenta: ${whatsappAccount.displayName || whatsappAccount.instanceName || whatsappAccount.phoneNumber}`
    );
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
