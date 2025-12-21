const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUserTenant() {
  try {
    const email = "kmfponce@gmail.com";
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
      console.log("❌ Usuario no encontrado:", email);
      return;
    }

    console.log("✅ Usuario encontrado:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Platform Role: ${user.platformRole}`);
    console.log(`\n📋 Membresías de Tenant: ${user.tenantmembership.length}`);

    if (user.tenantmembership.length === 0) {
      console.log("\n⚠️  El usuario NO tiene membresías de tenant.");
      console.log("   Esto causará un error al hacer login.");
      console.log("   Necesitas crear un tenant membership para este usuario.");
    } else {
      user.tenantmembership.forEach((membership, index) => {
        console.log(`\n   Membresía ${index + 1}:`);
        console.log(`     Tenant ID: ${membership.tenantId}`);
        console.log(`     Tenant Name: ${membership.tenant.name}`);
        console.log(`     Tenant Status: ${membership.tenant.status}`);
        console.log(`     Rol: ${membership.role}`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserTenant();
