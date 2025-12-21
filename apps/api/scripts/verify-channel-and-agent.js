/**
 * Script para verificar si existen el canal y el agente creados
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 Verificando canal y agente...\n");

    const tenantId = "cmj018os20000eq9yiwz99piy";

    // Verificar canales
    console.log("📢 Buscando canales...");
    const channels = await prisma.channel.findMany({
      where: {
        tenantId: tenantId,
        type: "WHATSAPP",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    console.log(`✅ Encontrados ${channels.length} canal(es) de WhatsApp:`);
    channels.forEach((ch) => {
      console.log(
        `   - ${ch.name} (${ch.id}) - ${ch.status} - Creado: ${ch.createdAt}`
      );
    });

    // Verificar agentes
    console.log("\n🤖 Buscando agentes...");
    const agents = await prisma.agent.findMany({
      where: {
        tenantId: tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    console.log(`✅ Encontrados ${agents.length} agente(s):`);
    agents.forEach((a) => {
      console.log(
        `   - ${a.name} (${a.id}) - ${a.status} - Creado: ${a.createdAt}`
      );
    });

    // Verificar cuenta WhatsApp
    console.log("\n📱 Verificando cuenta WhatsApp...");
    const whatsappAccount = await prisma.tenantwhatsappaccount.findFirst({
      where: {
        tenantId: tenantId,
        status: "CONNECTED",
      },
    });

    if (whatsappAccount) {
      console.log(
        `✅ Cuenta: ${whatsappAccount.displayName || whatsappAccount.instanceName || whatsappAccount.phoneNumber} (${whatsappAccount.id})`
      );
    } else {
      console.log("❌ No se encontró cuenta WhatsApp conectada");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error("   Stack:", error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
