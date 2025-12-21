const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function testLogin() {
  const email = "kmfponce@gmail.com";
  const password = "PlatformOwner2024!";

  console.log("🧪 Probando login directo...\n");

  try {
    // 1. Buscar usuario
    console.log("1️⃣ Buscando usuario...");
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenantmembership: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      console.log("❌ Usuario no encontrado");
      return;
    }
    console.log("✅ Usuario encontrado:", user.email);

    // 2. Verificar contraseña
    console.log("\n2️⃣ Verificando contraseña...");
    if (!user.passwordHash) {
      console.log("❌ Usuario sin contraseña");
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log("❌ Contraseña inválida");
      return;
    }
    console.log("✅ Contraseña válida");

    // 3. Verificar tenant membership
    console.log("\n3️⃣ Verificando tenant membership...");
    if (user.tenantmembership.length === 0) {
      console.log("❌ Usuario sin tenant membership");
      return;
    }

    const activeMembership =
      user.tenantmembership.find(
        (m) => m.tenant.status === "ACTIVE" || m.tenant.status === "TRIAL"
      ) || user.tenantmembership[0];

    if (!activeMembership) {
      console.log("❌ No hay tenant activo disponible");
      return;
    }
    console.log("✅ Tenant membership encontrado:");
    console.log(`   Tenant: ${activeMembership.tenant.name}`);
    console.log(`   Status: ${activeMembership.tenant.status}`);
    console.log(`   Rol: ${activeMembership.role}`);

    // 4. Resumen
    console.log("\n✅ Login debería funcionar correctamente");
    console.log("\n📋 Resumen:");
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   Platform Role: ${user.platformRole || "N/A"}`);
    console.log(`   Tenant: ${activeMembership.tenant.name}`);
    console.log(`   Rol en Tenant: ${activeMembership.role}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
