const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const email = "kmfponce@gmail.com";
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        platformRole: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log("❌ Usuario no encontrado:", email);
    } else {
      console.log("✅ Usuario encontrado:");
      console.log(
        JSON.stringify(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            hasPassword: !!user.passwordHash,
            platformRole: user.platformRole,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
          },
          null,
          2
        )
      );

      if (!user.passwordHash) {
        console.log("\n⚠️  El usuario no tiene contraseña configurada.");
        console.log(
          "   Esto puede ocurrir si el usuario fue creado con SSO o sin contraseña."
        );
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
