const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function resetPassword() {
  // Usar variables de entorno para mayor seguridad
  // Ejemplo: RESET_EMAIL=user@example.com RESET_PASSWORD=newpassword node reset-password.js
  const email = process.env.RESET_EMAIL;
  const newPassword = process.env.RESET_PASSWORD;

  if (!email || !newPassword) {
    console.error(
      "❌ Error: RESET_EMAIL y RESET_PASSWORD deben estar configurados como variables de entorno"
    );
    console.error(
      "   Ejemplo: RESET_EMAIL=user@example.com RESET_PASSWORD=newpassword node reset-password.js"
    );
    process.exit(1);
  }

  console.log("🔐 Reseteando contraseña para:", email);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("❌ Usuario no encontrado:", email);
      return;
    }

    // Hash de la contraseña
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);

    // Actualizar contraseña
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Contraseña actualizada exitosamente");
    console.log(`\n📋 Usuario actualizado:`);
    console.log(`   Email: ${email}`);
    // No mostrar la contraseña por seguridad

    // Verificar que la contraseña funciona
    const updatedUser = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true },
    });

    const isValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
    console.log(
      `\n🔍 Verificación: ${isValid ? "✅ Contraseña válida" : "❌ Contraseña inválida"}`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
