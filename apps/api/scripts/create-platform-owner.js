const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

async function createPlatformOwner() {
  const email = "kmfponce@gmail.com";
  const password = "PlatformOwner2024!"; // Contraseña temporal, debería cambiarse
  const name = "Platform Owner";

  console.log("🚀 Creando usuario Platform Owner...\n");

  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(
        `⚠️  Usuario ${email} ya existe. Actualizando platformRole...`
      );

      // Actualizar el usuario existente con platformRole
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          platformRole: "PLATFORM_OWNER",
          updatedAt: new Date(),
        },
      });

      console.log(
        `✅ Usuario ${email} actualizado con platformRole = PLATFORM_OWNER`
      );
      console.log(`\n📋 Detalles del usuario:`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Nombre: ${updatedUser.name || "N/A"}`);
      console.log(`   Platform Role: ${updatedUser.platformRole}`);
      console.log(`   ID: ${updatedUser.id}`);

      return updatedUser;
    }

    // Crear nuevo usuario con platformRole
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        passwordHash,
        name,
        locale: "es-ES",
        emailVerified: true,
        platformRole: "PLATFORM_OWNER",
        updatedAt: new Date(),
      },
    });

    console.log(
      `✅ Usuario ${email} creado exitosamente con platformRole = PLATFORM_OWNER`
    );
    console.log(`\n📋 Detalles del usuario:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Platform Role: ${user.platformRole}`);
    console.log(`   ID: ${user.id}`);
    console.log(`\n⚠️  Contraseña temporal: ${password}`);
    console.log(
      `   Por favor, cambia la contraseña después del primer inicio de sesión.`
    );

    return user;
  } catch (error) {
    console.error("❌ Error al crear usuario Platform Owner:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createPlatformOwner().catch((error) => {
  console.error(error);
  process.exit(1);
});
