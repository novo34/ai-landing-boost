/**
 * Script simple para configurar un usuario como PLATFORM_OWNER
 * No requiere ts-node, usa require directamente
 *
 * Uso: node apps/api/scripts/setup-platform-owner-simple.js <email>
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function setupPlatformOwner(email) {
  try {
    console.log(`🔍 Buscando usuario con email: ${email}...`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
      },
    });

    if (!user) {
      console.error(`❌ No se encontró usuario con email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado:`, {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRoleActual: user.platformRole || "null",
    });

    if (user.platformRole === "PLATFORM_OWNER") {
      console.log("✅ El usuario ya tiene el rol PLATFORM_OWNER");
      await prisma.$disconnect();
      return;
    }

    console.log(`🔄 Asignando rol PLATFORM_OWNER...`);

    const updated = await prisma.user.update({
      where: { email },
      data: { platformRole: "PLATFORM_OWNER" },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
      },
    });

    console.log("✅ Rol asignado correctamente:");
    console.log(JSON.stringify(updated, null, 2));
    console.log("\n🎉 El usuario ahora puede acceder a /platform");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener email del argumento
const email = process.argv[2];

if (!email) {
  console.error("❌ Debes proporcionar un email como argumento");
  console.log("\nUso:");
  console.log("  node apps/api/scripts/setup-platform-owner-simple.js <email>");
  console.log("\nEjemplo:");
  console.log(
    "  node apps/api/scripts/setup-platform-owner-simple.js admin@example.com"
  );
  process.exit(1);
}

setupPlatformOwner(email);
